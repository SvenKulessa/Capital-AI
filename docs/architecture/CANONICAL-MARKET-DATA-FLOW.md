# Canonical Market Data Flow

## Authority chain

```text
Admitted Provider
  -> Ingestion / Normalize / Admission
  -> NATS JetStream (CAPITAL_FACTS)
     -> PostgreSQL/Supabase canonical_market_facts
     -> MARKET scoring/screener consumers
     -> Valkey hot-state projection
```

### Invariants

- NATS JetStream is the event/replay backbone.
- PostgreSQL/Supabase is the queryable persistent source of record for acknowledged Market-Facts.
- Valkey is ephemeral and regenerable. It is never Evidence Authority.
- A Valkey projection is written only after JetStream acknowledgement and, in production, successful canonical DB persistence.
- MARKET scoring remains fail-closed unless source rights, mapping, freshness and scoring admission are valid.
- `scoreEligible` is independent from release-policy `decisionEligible`.
- Demo, simulated or unverified-rights records do not become productive evidence by persistence alone.

## NATS subjects and persistence

| Subject | Stream | Consumer / Projection | Persistent target |
|---|---|---|---|
| `capital.facts.quote.<SYMBOL>` | `CAPITAL_FACTS` | Canonical Market Store | `public.canonical_market_facts` |
| `capital.facts.quote.<SYMBOL>` | `CAPITAL_FACTS` | MARKET scorer/screener | score input only after admission |
| acknowledged quote | n/a | Valkey projection | `capital:quote:v1:<SYMBOL>` with bounded TTL |

The database migration is repository evidence only. Applying it to the production Supabase project remains a separate controlled PLATFORM/TRUST mutation.
