#!/usr/bin/env python3
"""Render deterministic CAPITAL-AI social images and optional short video.

Input is a local JSON manifest. The renderer never fetches remote media and has
no publishing authority.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from capital_ai_media import (
    MediaRenderError,
    load_brand_palette,
    normalize_text,
    render_brand_card,
    render_scene_frame,
    render_short_video,
    safe_output_stem,
    validate_scenes,
    validate_voiceover_binding,
    write_asset_manifest,
)

DEFAULT_DISCLAIMER = "Keine Anlageberatung. Bildungsinhalt von CAPITAL-AI."


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True, help="Local JSON render manifest")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--video", action="store_true", help="Also render 1080x1920 MP4")
    parser.add_argument(
        "--allow-gpl-ffmpeg",
        action="store_true",
        help="Developer-only override when local FFmpeg was compiled with --enable-gpl",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if not args.manifest.is_file():
            raise MediaRenderError(f"manifest not found: {args.manifest}")
        raw = json.loads(args.manifest.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise MediaRenderError("manifest root must be an object")
        if raw.get("schemaVersion") != "1.0.0":
            raise MediaRenderError("schemaVersion must be 1.0.0")
        if any(key in raw for key in ("mediaUrl", "imageUrl", "sourceUrl")):
            raise MediaRenderError("remote media URLs are not accepted by the deterministic renderer")

        slug = safe_output_stem(normalize_text(raw.get("slug"), field="slug", max_chars=80))
        title = normalize_text(raw.get("title"), field="title", max_chars=100)
        subtitle = normalize_text(raw.get("subtitle"), field="subtitle", max_chars=240)
        disclaimer = normalize_text(raw.get("disclaimer", DEFAULT_DISCLAIMER), field="disclaimer", max_chars=220)
        scenes = validate_scenes(raw.get("scenes"))
        voiceover = validate_voiceover_binding(raw.get("voiceover"), manifest_dir=args.manifest.parent)
        if voiceover is not None and not args.video:
            raise MediaRenderError("voiceover requires --video so audio evidence cannot be attached to image-only output")
        palette = load_brand_palette()
        args.out_dir.mkdir(parents=True, exist_ok=True)

        assets = []
        assets.append(render_brand_card(
            output_path=args.out_dir / f"{slug}-thumbnail-1280x720.png",
            width=1280, height=720, title=title, subtitle=subtitle,
            disclaimer=disclaimer, palette=palette,
        ))
        assets.append(render_brand_card(
            output_path=args.out_dir / f"{slug}-square-1080x1080.png",
            width=1080, height=1080, title=title, subtitle=subtitle,
            disclaimer=disclaimer, palette=palette,
        ))
        assets.append(render_brand_card(
            output_path=args.out_dir / f"{slug}-vertical-1080x1920.png",
            width=1080, height=1920, title=title, subtitle=subtitle,
            disclaimer=disclaimer, palette=palette,
        ))

        frame_pairs = []
        for index, scene in enumerate(scenes, start=1):
            frame_path = args.out_dir / f"{slug}-scene-{index:02d}.png"
            frame_asset = render_scene_frame(
                scene,
                output_path=frame_path,
                palette=palette,
                scene_index=index,
                scene_count=len(scenes),
            )
            assets.append(frame_asset)
            frame_pairs.append((frame_path, scene.duration_seconds))

        ffmpeg_payload = None
        if args.video:
            video_asset, ffmpeg_info = render_short_video(
                frame_pairs,
                output_path=args.out_dir / f"{slug}-short-1080x1920.mp4",
                allow_gpl_ffmpeg=args.allow_gpl_ffmpeg,
                voiceover=voiceover,
            )
            assets.append(video_asset)
            ffmpeg_payload = {
                "version": ffmpeg_info.version,
                "profile": ffmpeg_info.profile,
                "enableGpl": ffmpeg_info.enable_gpl,
                "enableNonfree": ffmpeg_info.enable_nonfree,
                "buildconfSha256": ffmpeg_info.buildconf_sha256,
            }

        renderer = {
            "image": "Pillow",
            "video": ffmpeg_payload,
            "videoCodec": "mpeg4" if args.video else None,
            "networkAccess": False,
            "brandTextMode": "deterministic",
            "voiceover": (
                {
                    "audioSha256": voiceover.audio_sha256,
                    "requestHash": voiceover.request_hash,
                    "contentPackageId": voiceover.content_package_id,
                    "candidateContentHash": voiceover.candidate_content_hash,
                    "runtimeEvidenceReference": voiceover.runtime_evidence_reference,
                    "licenseEvidenceReference": voiceover.license_evidence_reference,
                    "listeningReviewReference": voiceover.listening_review_reference,
                    "acceptanceStatus": "PASS",
                }
                if voiceover is not None
                else None
            ),
        }
        manifest_path = write_asset_manifest(
            output_path=args.out_dir / f"{slug}-asset-manifest.json",
            assets=assets,
            palette=palette,
            source={"type": "content-render-manifest", "path": args.manifest.name},
            renderer=renderer,
        )
        print(json.dumps({"ok": True, "manifest": str(manifest_path), "assetCount": len(assets)}, indent=2))
        return 0
    except (MediaRenderError, json.JSONDecodeError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
