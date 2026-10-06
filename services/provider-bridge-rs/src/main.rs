use async_nats::{Client, ConnectOptions};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::{env, time::{Duration, SystemTime, UNIX_EPOCH}};

const QUERY_SUBJECT: &str = "capital.private.provider.query.v1";
const EXECUTE_SUBJECT: &str = "capital.private.provider.execute.v1";
const MAX_REQUEST_BYTES: usize = 64 * 1024;
const MAX_RESPONSE_BYTES: usize = 256 * 1024;
const MAX_TTL_MS: i64 = 30_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryEnvelope {
    schema: String,
    request_id: String,
    user_ref: String,
    provider: String,
    operation: String,
    expires_at: i64,
    #[serde(default)]
    params: Map<String, Value>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

fn is_safe_id(value: &str, max: usize) -> bool {
    !value.is_empty()
        && value.len() <= max
        && value.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b':' | b'.'))
}

fn operation_allowed(provider: &str, operation: &str) -> bool {
    match provider {
        "kraken" => matches!(operation,
            "account.key_info" |
            "account.balance" |
            "account.trade_balance" |
            "orders.open" |
            "orders.closed" |
            "orders.query" |
            "trades.history" |
            "trades.query" |
            "positions.open" |
            "ledgers.list" |
            "ledgers.query" |
            "trade.volume" |
            "futures.account" |
            "futures.open_positions" |
            "futures.open_orders" |
            "futures.fills" |
            "futures.position_events"
        ),
        "binance" => matches!(operation,
            "account.permissions" |
            "spot.account" |
            "spot.open_orders" |
            "spot.all_orders" |
            "spot.my_trades" |
            "account.snapshot" |
            "futures.account" |
            "futures.balance" |
            "futures.position_risk" |
            "futures.open_orders" |
            "futures.all_orders" |
            "futures.user_trades" |
            "futures.income"
        ),
        _ => false,
    }
}

fn contains_forbidden_key(value: &Value) -> bool {
    match value {
        Value::Object(map) => map.iter().any(|(key, value)| {
            let normalized = key.to_ascii_lowercase().replace(['_', '-'], "");
            let forbidden = [
                "apikey", "apisecret", "secret", "password",
                "credential", "privatekey", "authorization", "token",
            ].iter().any(|needle| normalized.contains(needle));
            forbidden || contains_forbidden_key(value)
        }),
        Value::Array(items) => items.iter().any(contains_forbidden_key),
        _ => false,
    }
}

fn validate(payload: &[u8]) -> Result<QueryEnvelope, &'static str> {
    if payload.is_empty() || payload.len() > MAX_REQUEST_BYTES {
        return Err("REQUEST_SIZE_INVALID");
    }
    let raw: Value = serde_json::from_slice(payload).map_err(|_| "INVALID_JSON")?;
    if contains_forbidden_key(&raw) {
        return Err("SECRET_MATERIAL_FORBIDDEN");
    }
    let envelope: QueryEnvelope = serde_json::from_value(raw).map_err(|_| "INVALID_ENVELOPE")?;
    if envelope.schema != "CAPITAL_AI_PRIVATE_PROVIDER_QUERY@1" {
        return Err("SCHEMA_NOT_ADMITTED");
    }
    if !is_safe_id(&envelope.request_id, 96) || !is_safe_id(&envelope.user_ref, 96) {
        return Err("IDENTIFIER_INVALID");
    }
    if !operation_allowed(&envelope.provider, &envelope.operation) {
        return Err("OPERATION_NOT_ADMITTED");
    }
    let now = now_ms();
    if envelope.expires_at < now || envelope.expires_at > now.saturating_add(MAX_TTL_MS) {
        return Err("REQUEST_EXPIRED");
    }
    if serde_json::to_vec(&envelope.params).map(|v| v.len()).unwrap_or(MAX_REQUEST_BYTES + 1) > 32 * 1024 {
        return Err("PARAMS_TOO_LARGE");
    }
    Ok(envelope)
}

async fn respond_error(client: &Client, reply: Option<async_nats::Subject>, request_id: Option<&str>, code: &str) {
    let Some(reply) = reply else { return };
    let body = json!({
        "schema": "CAPITAL_AI_PRIVATE_PROVIDER_RESULT@1",
        "requestId": request_id,
        "ok": false,
        "error": code,
    }).to_string();
    let _ = client.publish(reply, body.into()).await;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let nats_url = env::var("NATS_URL")?;
    let user = env::var("NATS_BRIDGE_USER")?;
    let pass = env::var("NATS_BRIDGE_PASSWORD")?;
    if user.trim().is_empty() || pass.len() < 24 {
        return Err("bridge credentials are incomplete".into());
    }

    let client = ConnectOptions::new()
        .user_and_password(user, pass)
        .connection_timeout(Duration::from_secs(5))
        .subscription_capacity(128)
        .connect(nats_url)
        .await?;

    let mut subscriber = client
        .queue_subscribe(QUERY_SUBJECT, "capital-private-provider-bridge".to_string())
        .await?;

    eprintln!("provider-bridge ready subject={QUERY_SUBJECT}");

    while let Some(message) = subscriber.next().await {
        let reply = message.reply.clone();
        let envelope = match validate(&message.payload) {
            Ok(value) => value,
            Err(code) => {
                respond_error(&client, reply, None, code).await;
                continue;
            }
        };
        let request_id = envelope.request_id.clone();

        let response = tokio::time::timeout(
            Duration::from_secs(8),
            client.request(EXECUTE_SUBJECT, message.payload.clone()),
        ).await;

        match response {
            Ok(Ok(response)) if response.payload.len() <= MAX_RESPONSE_BYTES => {
                if let Some(reply) = reply {
                    let _ = client.publish(reply, response.payload).await;
                }
                eprintln!("provider-bridge request.completed requestId={request_id} outcome=ok");
            }
            Ok(Ok(_)) => {
                respond_error(&client, reply, Some(&request_id), "RESPONSE_TOO_LARGE").await;
            }
            Ok(Err(_)) => {
                respond_error(&client, reply, Some(&request_id), "EXECUTOR_UNAVAILABLE").await;
            }
            Err(_) => {
                respond_error(&client, reply, Some(&request_id), "EXECUTOR_TIMEOUT").await;
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> Value {
        json!({
            "schema": "CAPITAL_AI_PRIVATE_PROVIDER_QUERY@1",
            "requestId": "req-123",
            "userRef": "c0a8012e-7db1-4b64-a8c2-c4c70a902e12",
            "provider": "kraken",
            "operation": "account.balance",
            "expiresAt": now_ms() + 5000,
            "params": {}
        })
    }

    #[test]
    fn accepts_bounded_read_only_request() {
        let bytes = serde_json::to_vec(&valid()).unwrap();
        assert!(validate(&bytes).is_ok());
    }

    #[test]
    fn rejects_secret_material_anywhere() {
        let mut body = valid();
        body["params"] = json!({"apiSecret": "must-never-cross-nats"});
        let error = validate(&serde_json::to_vec(&body).unwrap()).unwrap_err();
        assert_eq!(error, "SECRET_MATERIAL_FORBIDDEN");
    }

    #[test]
    fn rejects_mutating_operation() {
        let mut body = valid();
        body["operation"] = json!("orders.create");
        let error = validate(&serde_json::to_vec(&body).unwrap()).unwrap_err();
        assert_eq!(error, "OPERATION_NOT_ADMITTED");
    }
}
