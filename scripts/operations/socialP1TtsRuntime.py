#!/usr/bin/env python3
"""Protected-runtime harness for the CAPITAL-AI SOCIAL-P1 TTS benchmark.

This script prepares *real* model/runtime/audio evidence for the existing
Social-owned acceptance contract. It does not install dependencies, provision
hardware, download credentials, publish media, or classify listening quality.

The benchmark remains protected runtime work. Run this only on a separately
authorized execution host with locally materialized, reviewable model
artifacts. The script writes partial runtime evidence only; transcript and
human listening evidence are finalized by socialP1TtsEvidence.ts.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import random
import sys
import time
from typing import Any, Iterable

EXPECTED_PROJECT = "CAPITAL-AI-SOCIAL"
EXPECTED_ROADMAP_ITEM = "SOCIAL-P1"
EXPECTED_FIXTURE_COUNT = 4
EXPECTED_CANDIDATES = ("qwen3-tts", "chatterbox-multilingual-v3")
EXPECTED_SAMPLE_RATE = 24_000
EXPECTED_CHANNELS = 1
EXPECTED_SEED = 42
QWEN_MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
CHATTERBOX_MODEL_ID = "ResembleAI/chatterbox"
CHATTERBOX_T3_MODEL = "t3_mtl23ls_v3.safetensors"
CHATTERBOX_GENERATION_PARAMETERS = {
    "exaggeration": 0.5,
    "cfg_weight": 0.5,
    "temperature": 0.8,
    "repetition_penalty": 1.2,
    "min_p": 0.05,
    "top_p": 1.0,
}
CHATTERBOX_PROSODY_REFERENCE_CASE_ID = "chatterbox-multilingual-v3::de-dialogue-host-v1"
CHATTERBOX_PROSODY_REFERENCE_AUDIO_SHA256 = "fa0f6a312095f35607bf470325e643ad3f625c01bd3f3a55e98b0b118afd37b0"

LANGUAGE_MAP_QWEN = {
    "de-DE": "German",
    "en-US": "English",
    "en-GB": "English",
}
LANGUAGE_MAP_CHATTERBOX = {
    "de-DE": "de",
    "en-US": "en",
    "en-GB": "en",
}

DEPENDENCY_PACKAGES = (
    "torch",
    "torchaudio",
    "soundfile",
    "huggingface-hub",
    "qwen-tts",
    "chatterbox-tts",
    "perth",
)


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_text(value: str) -> str:
    return _sha256_bytes(value.encode("utf-8"))


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"{path} must contain a JSON object")
    return value


def _required_text(value: Any, field: str) -> str:
    normalized = value.strip() if isinstance(value, str) else ""
    if not normalized:
        raise RuntimeError(f"{field} is required")
    return normalized


def _validate_manifest(manifest: dict[str, Any]) -> None:
    if manifest.get("project") != EXPECTED_PROJECT:
        raise RuntimeError(f"manifest.project must be {EXPECTED_PROJECT}")
    if manifest.get("roadmap_item") != EXPECTED_ROADMAP_ITEM:
        raise RuntimeError(f"manifest.roadmap_item must be {EXPECTED_ROADMAP_ITEM}")
    if manifest.get("generated_audio_status") != "NOT_RUN":
        raise RuntimeError("runtime must start from canonical generated_audio_status=NOT_RUN")
    if manifest.get("generated_audio") != []:
        raise RuntimeError("runtime must start from canonical generated_audio=[]")

    samples = manifest.get("samples")
    if not isinstance(samples, list) or len(samples) != EXPECTED_FIXTURE_COUNT:
        raise RuntimeError(f"SOCIAL-P1 requires exactly {EXPECTED_FIXTURE_COUNT} fixtures")

    sample_ids: set[str] = set()
    for index, sample in enumerate(samples):
        if not isinstance(sample, dict):
            raise RuntimeError(f"samples[{index}] must be an object")
        sample_id = _required_text(sample.get("sample_id"), f"samples[{index}].sample_id")
        if sample_id in sample_ids:
            raise RuntimeError(f"duplicate sample_id {sample_id}")
        sample_ids.add(sample_id)
        text = _required_text(sample.get("text"), f"samples[{index}].text")
        expected_hash = _required_text(sample.get("text_sha256"), f"samples[{index}].text_sha256").lower()
        if _sha256_text(text) != expected_hash:
            raise RuntimeError(f"fixture hash mismatch for {sample_id}")
        terms = sample.get("required_terms")
        if not isinstance(terms, list) or not terms or any(not isinstance(term, str) or not term.strip() for term in terms):
            raise RuntimeError(f"required_terms must be non-empty for {sample_id}")

    sources = manifest.get("candidate_sources")
    if not isinstance(sources, list):
        raise RuntimeError("candidate_sources must be an array")
    by_id = {
        entry.get("candidate_id"): entry
        for entry in sources
        if isinstance(entry, dict) and isinstance(entry.get("candidate_id"), str)
    }
    for candidate in EXPECTED_CANDIDATES:
        source = by_id.get(candidate)
        if not source:
            raise RuntimeError(f"missing candidate source {candidate}")
        _required_text(source.get("source"), f"candidate_sources.{candidate}.source")
        _required_text(source.get("license_surface"), f"candidate_sources.{candidate}.license_surface")
        if source.get("artifact_license_recheck_required") is not True:
            raise RuntimeError(f"candidate {candidate} must require exact artifact license recheck")

    personas = manifest.get("persona_intents")
    if not isinstance(personas, list) or not personas:
        raise RuntimeError("persona_intents must be non-empty")
    for persona in personas:
        if not isinstance(persona, dict) or persona.get("mode") != "designed":
            raise RuntimeError("SOCIAL-P1 runtime fixtures require designed persona intents")


def _dependency_identity() -> tuple[str, str]:
    versions: dict[str, str] = {
        "python": platform.python_version(),
        "platform": platform.platform(),
    }
    for package in DEPENDENCY_PACKAGES:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = "NOT_INSTALLED"
    canonical = _canonical_json(versions)
    return canonical, _sha256_text(canonical)


def _artifact_inventory(root: Path) -> tuple[list[dict[str, Any]], str]:
    if not root.exists() or not root.is_dir():
        raise RuntimeError(f"model artifact directory does not exist: {root}")

    inventory: list[dict[str, Any]] = []
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        if any(part in {".git", ".locks", "__pycache__"} for part in path.parts):
            continue
        data = path.read_bytes()
        inventory.append(
            {
                "path": path.relative_to(root).as_posix(),
                "size": len(data),
                "sha256": _sha256_bytes(data),
            }
        )
    if not inventory:
        raise RuntimeError(f"model artifact directory is empty: {root}")
    canonical = _canonical_json(inventory)
    return inventory, _sha256_text(canonical)


def _model_license_reference(candidate: str, model_dir: Path, inventory_hash: str) -> str:
    license_files = [
        path.relative_to(model_dir).as_posix()
        for path in model_dir.rglob("*")
        if path.is_file() and path.name.lower() in {"license", "license.txt", "license.md", "copying"}
    ]
    license_part = ",".join(sorted(license_files)) if license_files else "NO_LOCAL_LICENSE_FILE"
    return f"artifact://{candidate}/{inventory_hash}?license_files={license_part}"


def _seed_everything(seed: int, torch_module: Any, numpy_module: Any) -> None:
    random.seed(seed)
    numpy_module.random.seed(seed)
    torch_module.manual_seed(seed)
    if torch_module.cuda.is_available():
        torch_module.cuda.manual_seed_all(seed)


def _normalize_audio(samples: Any, sample_rate: int, numpy_module: Any) -> Any:
    array = numpy_module.asarray(samples, dtype=numpy_module.float32)
    array = numpy_module.squeeze(array)
    if array.ndim != 1:
        raise RuntimeError(f"expected mono waveform, got shape {array.shape}")
    if sample_rate != EXPECTED_SAMPLE_RATE:
        raise RuntimeError(
            f"runtime returned {sample_rate} Hz; SOCIAL-P1 contract requires {EXPECTED_SAMPLE_RATE} Hz. "
            "Do not silently resample benchmark evidence."
        )
    if array.size == 0:
        raise RuntimeError("runtime returned empty waveform")
    if not numpy_module.isfinite(array).all():
        raise RuntimeError("runtime returned NaN/Inf audio samples")
    return array


def _sync_cuda(torch_module: Any, device: str) -> None:
    if device.startswith("cuda") and torch_module.cuda.is_available():
        torch_module.cuda.synchronize()


def _synthesis_text(sample: dict[str, Any], candidate: str) -> tuple[str, str]:
    """Return an explicit speech projection while preserving canonical fixture identity."""
    if sample.get("sample_id") != "de-finance-numbers-v1":
        return sample["text"], "canonical_fixture_text"

    if candidate == "chatterbox-multilingual-v3":
        pronunciation_clause = (
            "BTC, Ethereum mit dem Kürzel E T H und Capital A I gehören hier in einen natürlichen, zusammenhängenden Satzfluss."
        )
        projection = "de_finance_pronunciation_projection_v6_chatterbox_semantic_eth"
    else:
        pronunciation_clause = "Sprich B T C, E T H und Capital A I klar aus."
        projection = "de_finance_pronunciation_projection_v1"

    text = (
        "Aussprachetest: zwölf Komma fünf Prozent und eintausendzweihundertvierunddreißig Euro "
        "und sechsundfünfzig Cent sind hier reine Testwerte und keine Marktdaten. "
        f"{pronunciation_clause} Dies ist keine Anlageberatung."
    )
    return text, projection


def _qwen_run(
    *,
    model: Any,
    sample: dict[str, Any],
    persona: dict[str, Any],
    device: str,
    torch_module: Any,
    numpy_module: Any,
) -> tuple[Any, int, float, dict[str, Any]]:
    language = LANGUAGE_MAP_QWEN.get(sample["language"])
    if not language:
        raise RuntimeError(f"unsupported Qwen language mapping: {sample['language']}")
    _seed_everything(EXPECTED_SEED, torch_module, numpy_module)
    _sync_cuda(torch_module, device)
    started = time.perf_counter()
    synthesis_text, pronunciation_projection = _synthesis_text(sample, "qwen3-tts")
    wavs, sample_rate = model.generate_voice_design(
        text=synthesis_text,
        language=language,
        instruct=persona["style_intent"],
    )
    _sync_cuda(torch_module, device)
    total_ms = (time.perf_counter() - started) * 1000.0
    if not isinstance(wavs, list) or len(wavs) != 1:
        raise RuntimeError("Qwen VoiceDesign must return exactly one waveform per benchmark case")
    return wavs[0], int(sample_rate), total_ms, {
        "persona_binding": "native_voice_design_instruction",
        "style_intent_enforced": True,
        "synthesis_text": synthesis_text,
        "synthesis_text_sha256": _sha256_text(synthesis_text),
        "pronunciation_projection": pronunciation_projection,
        "first_audio_measurement": "non_streaming_completion_proxy",
    }


def _chatterbox_run(
    *,
    model: Any,
    sample: dict[str, Any],
    device: str,
    torch_module: Any,
    numpy_module: Any,
) -> tuple[Any, int, float, dict[str, Any]]:
    language = LANGUAGE_MAP_CHATTERBOX.get(sample["language"])
    if not language:
        raise RuntimeError(f"unsupported Chatterbox language mapping: {sample['language']}")
    _seed_everything(EXPECTED_SEED, torch_module, numpy_module)
    _sync_cuda(torch_module, device)
    started = time.perf_counter()
    synthesis_text, pronunciation_projection = _synthesis_text(sample, "chatterbox-multilingual-v3")
    wav = model.generate(
        synthesis_text,
        language_id=language,
        **CHATTERBOX_GENERATION_PARAMETERS,
    )
    _sync_cuda(torch_module, device)
    total_ms = (time.perf_counter() - started) * 1000.0
    if hasattr(wav, "detach"):
        wav = wav.detach().cpu().numpy()
    return wav, int(model.sr), total_ms, {
        "persona_binding": "provider_builtin_conditioning_without_reference_audio",
        "style_intent_enforced": False,
        "synthesis_text": synthesis_text,
        "synthesis_text_sha256": _sha256_text(synthesis_text),
        "pronunciation_projection": pronunciation_projection,
        "generation_parameters": dict(CHATTERBOX_GENERATION_PARAMETERS),
        "prosody_reference": {
            "benchmark_case_id": CHATTERBOX_PROSODY_REFERENCE_CASE_ID,
            "audio_sha256": CHATTERBOX_PROSODY_REFERENCE_AUDIO_SHA256,
            "human_listening_verdict": "PASS_USABLE_REFERENCE",
        },
        "style_gap": "Chatterbox Multilingual V3 does not consume the Social designed-persona text instruction; human listening review must assess suitability.",
        "first_audio_measurement": "non_streaming_completion_proxy",
    }


def _select_samples(manifest: dict[str, Any], requested: Iterable[str]) -> list[dict[str, Any]]:
    requested_set = set(requested)
    samples = list(manifest["samples"])
    if not requested_set or "all" in requested_set:
        return samples
    known = {sample["sample_id"] for sample in samples}
    unknown = requested_set - known
    if unknown:
        raise RuntimeError(f"unknown sample ids: {sorted(unknown)}")
    return [sample for sample in samples if sample["sample_id"] in requested_set]


def _select_candidates(requested: Iterable[str]) -> list[str]:
    requested_set = set(requested)
    if not requested_set or "all" in requested_set:
        return list(EXPECTED_CANDIDATES)
    unknown = requested_set - set(EXPECTED_CANDIDATES)
    if unknown:
        raise RuntimeError(f"unknown candidates: {sorted(unknown)}")
    return [candidate for candidate in EXPECTED_CANDIDATES if candidate in requested_set]


def _hardware_identity(torch_module: Any, device: str) -> str:
    if device.startswith("cuda"):
        if not torch_module.cuda.is_available():
            raise RuntimeError("CUDA benchmark requested but torch.cuda.is_available() is false")
        index = torch_module.device(device).index or 0
        props = torch_module.cuda.get_device_properties(index)
        return (
            f"cuda:{index};name={props.name};total_memory={props.total_memory};"
            f"cuda_runtime={torch_module.version.cuda};torch={torch_module.__version__}"
        )
    return f"{device};machine={platform.machine()};processor={platform.processor()};torch={torch_module.__version__}"


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("docs/social-media/CAPITAL-AI-SOCIAL/reports/SOCIAL_P1_TTS_SAMPLE_MANIFEST_2026-09-11.json"),
    )
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--qwen-model-dir", type=Path)
    parser.add_argument("--chatterbox-model-dir", type=Path)
    parser.add_argument("--candidate", action="append", default=[])
    parser.add_argument("--sample", action="append", default=[])
    parser.add_argument("--device", default="cuda:0")
    parser.add_argument("--allow-non-gpu-smoke", action="store_true")
    parser.add_argument("--plan-only", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    manifest = _read_json(args.manifest)
    _validate_manifest(manifest)
    candidates = _select_candidates(args.candidate)
    samples = _select_samples(manifest, args.sample)

    plan = {
        "schema_version": "1.0.0",
        "manifest_id": manifest["manifest_id"],
        "candidates": candidates,
        "samples": [sample["sample_id"] for sample in samples],
        "expected_runs": len(candidates) * len(samples),
        "benchmark_complete_only_if": len(candidates) == 2 and len(samples) == 4,
        "protected_runtime": True,
    }
    if args.plan_only:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return 0

    if not args.device.startswith("cuda") and not args.allow_non_gpu_smoke:
        raise RuntimeError("SOCIAL-P1 benchmark execution requires CUDA; use --allow-non-gpu-smoke only for non-acceptance smoke runs")
    benchmark_eligible = args.device.startswith("cuda")

    if "qwen3-tts" in candidates and not args.qwen_model_dir:
        raise RuntimeError("--qwen-model-dir is required for qwen3-tts; runtime must use locally materialized auditable artifacts")
    if "chatterbox-multilingual-v3" in candidates and not args.chatterbox_model_dir:
        raise RuntimeError("--chatterbox-model-dir is required for chatterbox-multilingual-v3; runtime must use locally materialized auditable artifacts")

    args.output_dir.mkdir(parents=True, exist_ok=False)
    audio_dir = args.output_dir / "audio"
    artifact_dir = args.output_dir / "artifact-inventory"
    audio_dir.mkdir()
    artifact_dir.mkdir()

    try:
        import numpy as np
        import soundfile as sf
        import torch
    except ImportError as exc:
        raise RuntimeError("runtime dependencies are not installed; this harness never installs packages itself") from exc

    hardware = _hardware_identity(torch, args.device)
    dependency_identity, dependency_hash = _dependency_identity()

    personas = {persona["role"]: persona for persona in manifest["persona_intents"]}
    candidate_sources = {entry["candidate_id"]: entry for entry in manifest["candidate_sources"]}
    records: list[dict[str, Any]] = []
    model_cache: dict[str, Any] = {}
    inventory_cache: dict[str, tuple[str, str]] = {}

    for candidate in candidates:
        if candidate == "qwen3-tts":
            model_dir = args.qwen_model_dir.resolve()
        else:
            model_dir = args.chatterbox_model_dir.resolve()
        inventory, inventory_hash = _artifact_inventory(model_dir)
        inventory_path = artifact_dir / f"{candidate}.json"
        inventory_path.write_text(
            json.dumps({"candidate_id": candidate, "root": str(model_dir), "files": inventory, "aggregate_sha256": inventory_hash}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        inventory_cache[candidate] = (inventory_hash, _model_license_reference(candidate, model_dir, inventory_hash))

        if candidate == "qwen3-tts":
            try:
                from qwen_tts import Qwen3TTSModel
            except ImportError as exc:
                raise RuntimeError("qwen-tts is not installed") from exc
            model_cache[candidate] = Qwen3TTSModel.from_pretrained(
                str(model_dir),
                device_map=args.device,
                dtype=torch.bfloat16,
                attn_implementation="flash_attention_2",
            )
        else:
            try:
                from chatterbox.mtl_tts import ChatterboxMultilingualTTS
            except ImportError as exc:
                raise RuntimeError("chatterbox-tts is not installed") from exc
            if not (model_dir / CHATTERBOX_T3_MODEL).exists():
                raise RuntimeError(f"Chatterbox V3 artifact missing: {model_dir / CHATTERBOX_T3_MODEL}")
            model_cache[candidate] = ChatterboxMultilingualTTS.from_local(
                model_dir,
                args.device,
                t3_model="v3",
            )

    for candidate in candidates:
        model = model_cache[candidate]
        inventory_hash, license_reference = inventory_cache[candidate]
        for sample in samples:
            persona = personas.get(sample["role"])
            if not persona:
                raise RuntimeError(f"missing persona intent for role {sample['role']}")
            case_id = f"{candidate}::{sample['sample_id']}"

            if candidate == "qwen3-tts":
                raw_audio, sample_rate, total_ms, adapter_semantics = _qwen_run(
                    model=model,
                    sample=sample,
                    persona=persona,
                    device=args.device,
                    torch_module=torch,
                    numpy_module=np,
                )
                provider_id = "qwen-local-runtime"
                model_id = QWEN_MODEL_ID
                watermark = {"type": "none"}
            else:
                raw_audio, sample_rate, total_ms, adapter_semantics = _chatterbox_run(
                    model=model,
                    sample=sample,
                    device=args.device,
                    torch_module=torch,
                    numpy_module=np,
                )
                provider_id = "resemble-local-runtime"
                model_id = f"{CHATTERBOX_MODEL_ID}:{CHATTERBOX_T3_MODEL}"
                watermark = {
                    "type": "provider_native",
                    "detector_reference": "https://github.com/resemble-ai/perth",
                }

            audio = _normalize_audio(raw_audio, sample_rate, np)
            output_path = audio_dir / f"{candidate}--{sample['sample_id']}.wav"
            sf.write(output_path, audio, sample_rate, subtype="PCM_16")
            audio_bytes = output_path.read_bytes()
            duration_ms = (len(audio) / sample_rate) * 1000.0
            if total_ms <= 0 or duration_ms <= 0:
                raise RuntimeError(f"invalid timing for {case_id}")

            evidence_ref = f"file://{(args.output_dir / 'runtime-evidence.partial.json').resolve()}#{case_id}"
            source = candidate_sources[candidate]
            records.append(
                {
                    "benchmark_case_id": case_id,
                    "candidate_id": candidate,
                    "sample_id": sample["sample_id"],
                    "benchmark_eligible": benchmark_eligible,
                    "provider_id": provider_id,
                    "model_id": model_id,
                    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "license_reference": license_reference,
                    "candidate_source": source["source"],
                    "candidate_license_surface": source["license_surface"],
                    "evidence_reference": evidence_ref,
                    "audio": {
                        "asset_reference": f"file://{output_path.resolve()}",
                        "sha256": _sha256_bytes(audio_bytes),
                        "format": "wav",
                        "sample_rate_hz": sample_rate,
                        "channels": EXPECTED_CHANNELS,
                        "duration_ms": duration_ms,
                        "watermark": watermark,
                    },
                    "runtime": {
                        "runtime_id": "capital-ai-social-p1-local-model-harness",
                        "runtime_version": "1.0.0",
                        "hardware_identity": hardware,
                        "dependency_identity": dependency_identity,
                        "dependency_sha256": dependency_hash,
                        "model_artifact_sha256": inventory_hash,
                    },
                    "timing": {
                        "first_audio_latency_ms": total_ms,
                        "total_latency_ms": total_ms,
                        "realtime_factor": total_ms / duration_ms,
                    },
                    "adapter_semantics": adapter_semantics,
                }
            )

    output = {
        "schema_version": "1.0.0",
        "manifest_id": manifest["manifest_id"],
        "source_manifest_sha256": _sha256_bytes(args.manifest.read_bytes()),
        "protected_runtime": True,
        "benchmark_eligible": benchmark_eligible,
        "expected_complete_run_count": 8,
        "actual_run_count": len(records),
        "complete_matrix": len(records) == 8 and len(candidates) == 2 and len(samples) == 4,
        "runtime_records": records,
        "truth_boundary": "PARTIAL_RUNTIME_EVIDENCE_ONLY — transcript and human listening review are intentionally absent and must not be fabricated.",
    }
    output_path = args.output_dir / "runtime-evidence.partial.json"
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output_path)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"SOCIAL-P1 runtime harness blocked: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
