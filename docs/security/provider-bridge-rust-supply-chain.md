# Provider-Bridge Rust Supply-Chain Evidence

Stand: 2026-10-06

## Scope

Diese Evidence gilt ausschließlich für `services/provider-bridge-rs`. Sie ist keine Production-, Security- oder allgemeine Lizenzfreigabe der Webanwendung.

## Rust Toolchain und Gates

- MSRV / Build-Toolchain: Rust 1.99.0
- Lockfile: wird mit Rust 1.99.0 erzeugt und anschließend ausschließlich mit `--locked` verwendet.
- Pflichtgates: `cargo test --locked`, `cargo clippy --locked --all-targets -- -D warnings`, `cargo audit`, `cargo deny check advisories licenses bans sources`.

## CDLA-Permissive-2.0

`cargo-deny` hat `CDLA-Permissive-2.0` ausschließlich über `webpki-roots` 0.26.11 und 1.0.9 festgestellt.

Upstream-Provenienz:
- Projekt: `rustls/webpki-roots`
- Inhalt: Mozilla/CCADB Trusted Root Certificates für rustls/webpki.
- Upstream dokumentiert die zugrunde liegenden CCADB-Daten und die daraus abgeleiteten `webpki-roots`-Daten unter `CDLA-2.0-Permissive`.
- Tooling in demselben Upstream-Projekt ist separat MIT/Apache-2.0 lizenziert.

Dependency-Pfad zum Provider-Bridge-Binary:
`capital-ai-provider-bridge -> async-nats -> tokio-websockets -> webpki-roots`.

Entscheidung:
`CDLA-Permissive-2.0` wird nur in der Rust-Bridge-`deny.toml` zugelassen. Diese Zulassung deckt die vertrauenswürdigen Root-Zertifikatsdaten ab und erweitert keine globale CAPITAL-AI-Lizenzpolicy.

## Fail-closed

Ein grünes Cargo-/License-Gate ist nur Supply-Chain-Evidence. Container-Scan, SBOM, Runtime-Härtung, Render-Handoff und Production-Evidence bleiben separate Gates.
