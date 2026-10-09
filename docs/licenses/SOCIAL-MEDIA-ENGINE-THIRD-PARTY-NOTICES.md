# SOCIAL MEDIA ENGINE — Third-Party Notices

Stand: 2026-10-06
Scope: CAPITAL-AI Social Media Engine migration baseline.

This notice is an engineering distribution inventory. It does not override upstream license texts. Only artifacts explicitly admitted by the machine-readable Social Tool Admission may enter a customer/commercial bundle.

## Commercial product bundle baseline

| Component | Locked artifact | License | Distribution decision |
|---|---|---|---|
| D3 Scale | 4.0.2; npm integrity `sha512-GZW464g1SH7ag3Y7hXjf8RoUuAFIqklOAq3MRl4OaWabTFJY9PN/E1YklhXLh+OQ3fM9yS2nOkCoS+WLZ6kvxQ==` | ISC | commercial bundle allowed; target imports only `scalePoint`; retain copyright/license notice |
| Pillow | 12.3.0; CPython 3.11 musllinux x86_64 wheel SHA-256 `236ff70b9312fb68943c703aa842ca6a758abfa45ac187a5e7c1452e96ef72b5` | MIT-CMU | artifact locked; customer/runtime shipment waits for renderer-worker SBOM/image admission |

## Commercial internal-service candidates

These components are not customer-bundled by this notice. Their exact model/runtime artifacts remain separately gated.

| Component | Locked identity | License surface | State |
|---|---|---|---|

## Removed Social audio runtimes

By owner decision on 2026-10-08, Qwen/Qwen3-TTS, Chatterbox and the Whisper family (OpenAI Whisper and Faster-Whisper) are not part of the CAPITAL-AI Social Media Engine runtime, distribution baseline or active model admission. No model weights or worker runtime for these candidates may be promoted through the Social Media Engine without a new explicit owner decision.

## FFmpeg

FFmpeg 9.0.2 source is pinned to SHA-256 `8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e`. CAPITAL-AI uses a dedicated LGPL-only shared-library build profile (`deploy/social-media/ffmpeg-build-profile.json`) with `--enable-gpl`, `--enable-version3` and `--enable-nonfree` forbidden. The Finance renderer requires only native MPEG-4 Part 2 video, native AAC audio, concat and standard filters. Production packaging remains blocked until the actual ffmpeg/ffprobe binaries, `ffmpeg -buildconf`, OCI digest and SBOM are bound. Historical Finance FFmpeg 7.1.5 evidence was GPL-enabled and is not accepted as product-distribution evidence.

## Poppler

Poppler is **not part of the sold/customer Social Media Engine baseline**. PDF rasterization through Poppler may remain an external/operator/research companion only. Bundling Poppler later requires a separate GPL packaging/redistribution decision and exact binary evidence.

## Explicit exclusions

The following are not admitted into the commercial customer bundle by this notice: F5-TTS official CC-BY-NC pretrained weights, ComfyUI, MoneyPrinterTurbo, MuseTalk, Wan2.2, Remotion, or any other candidate whose exact artifact/license state remains RESEARCH_ONLY or BLOCKED_UNKNOWN.

## Authority

Machine-readable authority:
- `CAPITAL-AI-GROWTH/social-media-tool-admission.yaml`
- `CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json`

Finance scoring/weighting/data migration is outside this notice and remains blocked until the Social Media Engine completion gate passes.
