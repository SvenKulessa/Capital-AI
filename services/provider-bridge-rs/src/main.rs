use async_nats::{Client, ConnectOptions};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::{env, future::Future, sync::OnceLock, time::{Duration, SystemTime, UNIX_EPOCH}};

const QUERY_SUBJECT: &str = "capital.private.provider.query.v1";
const EXECUTE_SUBJECT: &str = "capital.private.provider.execute.v1";
const MAX_REQUEST_BYTES: usize = 64 * 1024;
const MAX_RESPONSE_BYTES: usize = 256 * 1024;
const MAX_TTL_MS: i64 = 30_000;
const CONTRACT_JSON: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/private-provider-query-operations.json"));

fn contract() -> &'static Value {
    static CONTRACT: OnceLock<Value> = OnceLock::new();
    CONTRACT.get_or_init(|| serde_json::from_str(CONTRACT_JSON).expect("embedded provider contract must be valid JSON"))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryEnvelope {
    schema: String,
    request_id: String,
    user_ref: String,
    provider: String,
    operation: String,
    expires_at: i64,
    proof: String,
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

fn operation_allowed(provider: &str, operation: &str, params: &Map<String, Value>) -> bool {
    let Some(operation_policy) = contract()
        .get("providers")
        .and_then(|v| v.get(provider))
        .and_then(|v| v.get("operations"))
        .and_then(|v| v.get(operation))
    else {
        return false;
    };

    let Some(allowed_params) = operation_policy.get("params").and_then(Value::as_array) else {
        return false;
    };

    params.keys().all(|key| {
        allowed_params
            .iter()
            .filter_map(Value::as_str)
            .any(|allowed| allowed == key)
    })
}

fn contains_forbidden_key(value: &Value) -> bool {
    match value {
        Value::Object(map) => map.iter().any(|(key, value)| {
            let normalized = key.to_ascii_lowercase().replace(['_', '-'], "");
            let forbidden = [
                "apikey", "apisecret", "secret", "password",
                "credential", "privatekey", "authorization",
                "accesstoken", "authtoken", "bearertoken",
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
    if !operation_allowed(&envelope.provider, &envelope.operation, &envelope.params) {
        return Err("OPERATION_NOT_ADMITTED");
    }
    if envelope.proof.len() != 64 || !envelope.proof.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("INVALID_QUERY_PROOF");
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

async fn with_executor_timeout<F, T>(future: F, timeout: Duration) -> Result<T, &'static str>
where
    F: Future<Output = T>,
{
    tokio::time::timeout(timeout, future)
        .await
        .map_err(|_| "EXECUTOR_TIMEOUT")
}

async fn connect_bridge() -> Result<Client, Box<dyn std::error::Error + Send + Sync>> {
    let nats_url = env::var("NATS_URL")?;
    let user = env::var("NATS_BRIDGE_USER")?;
    let pass = env::var("NATS_BRIDGE_PASSWORD")?;
    if user.trim().is_empty() || pass.len() < 24 {
        return Err("bridge credentials are incomplete".into());
    }
    Ok(ConnectOptions::new()
        .user_and_password(user, pass)
        .connection_timeout(Duration::from_secs(5))
        .connect(nats_url)
        .await?)
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
    let client = connect_bridge().await?;

    if env::args().nth(1).as_deref() == Some("--healthcheck") {
        client.flush().await?;
        return Ok(());
    }

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

        let response = with_executor_timeout(
            client.request(EXECUTE_SUBJECT, message.payload.clone()),
            Duration::from_secs(8),
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
            Err(code) => {
                respond_error(&client, reply, Some(&request_id), code).await;
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
            "proof": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
    fn accepts_binance_read_only_request() {
        let mut body = valid();
        body["provider"] = json!("binance");
        body["operation"] = json!("spot.open_orders");
        body["params"] = json!({"symbol": "BTCUSDT"});
        assert!(validate(&serde_json::to_vec(&body).unwrap()).is_ok());
    }

    #[test]
    fn accepts_private_market_batches_without_secret_parameters() {
        for (provider, category) in [("kraken", "KRYPTO"), ("massive", "AKTIEN"),
            ("massive", "INDIZIES"), ("massive", "FOREX"), ("massive", "ROHSTOFFE")] {
            let mut body = valid();
            body["provider"] = json!(provider);
            body["operation"] = json!("market.asset_class_snapshot");
            body["params"] = json!({"category": category});
            assert!(validate(&serde_json::to_vec(&body).unwrap()).is_ok());
            body["params"]["apiKey"] = json!("forbidden-fixture-key");
            assert_eq!(validate(&serde_json::to_vec(&body).unwrap()).unwrap_err(),
                "SECRET_MATERIAL_FORBIDDEN");
        }
    }

    #[test]
    fn rejects_unknown_parameter() {
        let mut body = valid();
        body["params"] = json!({"unexpected": "x"});
        let error = validate(&serde_json::to_vec(&body).unwrap()).unwrap_err();
        assert_eq!(error, "OPERATION_NOT_ADMITTED");
    }

    #[test]
    fn rejects_mutating_operation() {
        let mut body = valid();
        body["operation"] = json!("orders.create");
        let error = validate(&serde_json::to_vec(&body).unwrap()).unwrap_err();
        assert_eq!(error, "OPERATION_NOT_ADMITTED");
    }

    #[test]
    fn rejects_expired_and_oversized_requests() {
        let mut expired = valid();
        expired["expiresAt"] = json!(now_ms() - 1);
        assert_eq!(
            validate(&serde_json::to_vec(&expired).unwrap()).unwrap_err(),
            "REQUEST_EXPIRED"
        );
        let oversized = vec![b'x'; MAX_REQUEST_BYTES + 1];
        assert_eq!(validate(&oversized).unwrap_err(), "REQUEST_SIZE_INVALID");
    }

    #[tokio::test]
    async fn executor_timeout_is_bounded() {
        let result = with_executor_timeout(
            std::future::pending::<()>(),
            Duration::from_millis(5),
        ).await;
        assert_eq!(result.unwrap_err(), "EXECUTOR_TIMEOUT");
    }
}
