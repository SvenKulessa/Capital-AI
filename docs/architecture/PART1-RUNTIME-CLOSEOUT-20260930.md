# CAPITAL AI — Part 1 Runtime Closeout Evidence

**Date:** 2026-09-30  
**Repository baseline:** `main@bfaa25754fe8a80afc280b72ce0fef5145c6f912`  
**Workspace:** AICapital  
**Scope:** Part 1 runtime gates for Pub/Sub, NATS restart recovery and immutable Render image identity.

## 1. Controlled NATS restart — production evidence

Render private service:

- service: `capital-ai-market-events`
- service id: `srv-dauhcoojo6nc738eedjg`
- region: Frankfurt
- persistent disk: `dsk-dauhcp0jo6nc738eee20`, 5 GB, mounted at `/var/data`
- NATS: 2.15.0
- deploy: `dep-dauo42vlk1mc73dkr3lg`
- source: `bfaa25754fe8a80afc280b72ce0fef5145c6f912`

Observed sequence:

1. Render sent termination to the prior NATS instance.
2. NATS logged JetStream shutdown before process exit.
3. The replacement instance started against `/var/data/jetstream/jetstream`.
4. JetStream logged restore for stream `CAPITAL_FACTS`.
5. **56,118 messages were restored in 11 ms.**
6. NATS returned to `Server is ready` on port 4222.
7. Render marked the deploy `live`.

This verifies persistence and stream recovery across a real Render service replacement.
It does not by itself prove an external backup archive restore.

## 2. Pub/Sub subscriber admission

Before this slice, `subscribeQuotes()` existed and was locally tested, but no production code registered a listener.
Therefore the earlier production state could prove publisher availability but not subscriber delivery.

This slice registers one internal no-side-effect probe listener after infrastructure startup.
The probe exists only to prove the already-validated Redis/Valkey Pub/Sub delivery path.
It does not rank, alert, trade or expose a websocket.

`/api/market/status` now reports:

- `subscriber`
- `subscriberListeners`
- `verifiedDeliveries`
- `lastVerifiedDeliveryAt`
- `lastVerifiedSymbol`

A delivery increments counters only after:

1. Redis Pub/Sub payload passes the delivery schema.
2. freshness passes.
3. the referenced JetStream evidence can be replayed.
4. the replayed durable fact exactly matches the Pub/Sub notification.

This preserves the rule that ephemeral Pub/Sub can never create truth.

## 3. Backup and restore boundary

The 5-GB Render persistent disk is the primary JetStream store. Render persistent disks receive automatic
daily snapshots, but a disk snapshot restore rewinds the whole disk and discards changes made after that
snapshot. A blind production snapshot restore is therefore not used as a routine health test.

Part 1 accepts two different controls:

- **Restart recovery:** VERIFIED by the controlled production redeploy above.
- **Disaster-recovery backup:** provider snapshot coverage exists; an actual destructive snapshot restore
  remains a scheduled DR drill and must capture pre-restore stream sequence/count, snapshot timestamp,
  expected data-loss window and post-restore evidence replay.

A future logical JetStream export can supplement provider snapshots, but must not weaken
`deny_delete`, `deny_purge`, evidence hashes or stream admission.

## 4. Render/GHCR image identity

Current Capital-AI service is image-backed and configured with an immutable GHCR digest reference.

Render exposes two different image identity fields on the active deploy:

- `image.ref`: the requested immutable registry reference, including the GHCR manifest digest.
- `image.sha`: a separate provider-reported image SHA.

The previous handoff verifier incorrectly required these two values to be identical. The gate now requires:

1. service `imagePath` exactly equals the attested immutable `candidate.imageRef`;
2. live deploy `image.ref` exactly equals the same candidate reference;
3. Render reports a syntactically valid provider `image.sha`;
4. image-contained `buildIdentity.sourceSha` must still equal the attested source SHA.

Thus the immutable manifest reference remains the deployment binding while Render's additional SHA is retained as evidence instead of being misinterpreted.

## 5. Remaining closeout gates

After this PR is merged and a fresh candidate image for that exact merge SHA is published/deployed:

- verify `subscriber=connected` and `verifiedDeliveries > 0`;
- verify a new delivery occurs after a controlled NATS reconnect/restart;
- read `/healthz` and bind source SHA to the exact GHCR candidate;
- run the production handoff verifier with current Render service/deploy data.

No scorer is promoted by this runtime slice. Analysis components remain subject to the Part-1 registry,
provider-rights, feature, evidence, confidence, eligibility and risk gates.
