# SOCIAL MEDIA ENGINE — Third-Party Notices

Stand: 2026-10-06  
Scope: CAPITAL-AI Social Media Engine migration baseline.

This notice is an engineering distribution inventory. It does not override upstream license texts. Only artifacts explicitly admitted by the machine-readable Social Tool Admission may enter a customer/commercial bundle.

## Commercial product bundle baseline

| Component | Locked artifact | License | Distribution decision |
|---|---|---|---|
| D3 | 7.9.0; npm integrity `sha512-e1U46jVP+w7Iut8Jt8ri1YsPOvFpg46k+K8TpCb0P+zjCkjkPnV7WzfDJzMHy1LnA+wj5pLT1wjO901gLXeEhA==` | ISC | commercial bundle allowed; retain copyright/license notice |
| Pillow | 12.3.0; CPython 3.11 musllinux x86_64 wheel SHA-256 `236ff70b9312fb68943c703aa842ca6a758abfa45ac187a5e7c1452e96ef72b5` | MIT-CMU | artifact locked; customer/runtime shipment waits for renderer-worker SBOM/image admission |

## Commercial internal-service candidates

These components are not customer-bundled by this notice. Their exact model/runtime artifacts remain separately gated.

| Component | Locked identity | License surface | State |
|---|---|---|---|
| qwen-tts | 0.1.1 wheel SHA-256 `11a290d8dabc7ef91a90c54478c8ab19b3edb1d85c0882313721892bdc4af15d` | Apache-2.0 | internal-service candidate; transitive runtime lock pending |
| Qwen3-TTS VoiceDesign | HF revision `5ecdb67327fd37bb2e042aab12ff7391903235d3`; model SHA-256 `391e8db219f292c515297cdceeb43e4eae67cdde35fa57e79a6a8a532fca0522`; speech-tokenizer SHA-256 `836b7b357f5ea43e889936a3709af68dfe3751881acefe4ecf0dbd30ba571258` | Apache-2.0 model card | runtime/listening acceptance pending |
| Chatterbox source | Git commit `5de7a54aa4e5e2baadb0182dde554908b48b85c2` | MIT | dependency lock pending |
| Chatterbox model snapshot | HF revision `5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`; principal weight hashes in machine-readable evidence | MIT model card | companion hashes + listening acceptance pending |
| OpenAI Whisper | package 20250625; small SHA-256 `9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794`; large-v3 SHA-256 `e5b1a55b89c1367dacf97e3e19bfd829a01529dbfdeefa8caeb59b3f1b81dadb` | MIT | FFmpeg/worker image gate pending |

## FFmpeg

FFmpeg remains **BLOCKED for production packaging** until CAPITAL-AI selects one exact worker build, records its binary/package SHA-256 and `ffmpeg -buildconf`, verifies `--enable-nonfree` is absent, and resolves the resulting LGPL/GPL obligations. Historical Finance FFmpeg 7.1.5 evidence was GPL-enabled and is not accepted as product-distribution evidence.

## Poppler

Poppler is **not part of the sold/customer Social Media Engine baseline**. PDF rasterization through Poppler may remain an external/operator/research companion only. Bundling Poppler later requires a separate GPL packaging/redistribution decision and exact binary evidence.

## Explicit exclusions

The following are not admitted into the commercial customer bundle by this notice: F5-TTS official CC-BY-NC pretrained weights, ComfyUI, MoneyPrinterTurbo, MuseTalk, Wan2.2, Remotion, or any other candidate whose exact artifact/license state remains RESEARCH_ONLY or BLOCKED_UNKNOWN.

## Authority

Machine-readable authority:
- `CAPITAL-AI-GROWTH/social-media-tool-admission.yaml`
- `CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json`

Finance scoring/weighting/data migration is outside this notice and remains blocked until the Social Media Engine completion gate passes.
