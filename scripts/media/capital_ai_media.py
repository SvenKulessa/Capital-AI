#!/usr/bin/env python3
"""Deterministic CAPITAL-AI image and short-video rendering primitives.

WP-N3 / ADR-0094.

Security properties:
- local files only; no network fetching;
- bounded scene count/duration/text lengths;
- subprocesses use argv lists with shell=False and timeouts;
- generated files are hashed and described in a machine-readable manifest;
- FFmpeg builds compiled with --enable-nonfree are always refused;
- GPL-enabled FFmpeg builds are refused by default and require an explicit
  developer override. Production should use a reviewed LGPL-compatible build.

This module renders brand-critical copy deterministically. It is not a social
publisher and deliberately has no OAuth, database, billing, or infrastructure
credentials/capabilities.
"""

from __future__ import annotations

import hashlib
import json
import math
import mimetypes
import re
import shutil
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TOKEN_PATH = REPOSITORY_ROOT / "public" / "branding" / "asset-pack" / "meta" / "social-render-tokens.json"
MAX_SCENES = 8
MAX_TOTAL_DURATION_SECONDS = 60.0
MIN_TOTAL_DURATION_SECONDS = 5.0
MAX_TEXT_CHARS = 320
SUBPROCESS_TIMEOUT_SECONDS = 120


class MediaRenderError(RuntimeError):
    """Fail-closed renderer error safe to expose to CLI callers."""


@dataclass(frozen=True)
class BrandPalette:
    background: str
    foreground: str
    gold_light: str
    gold: str
    gold_dark: str
    gold_muted: str
    cyan: str
    purple: str
    text_primary: str
    text_secondary: str
    surface_light: str
    border_light: str


@dataclass(frozen=True)
class RenderScene:
    title: str
    body: str
    duration_seconds: float
    kicker: str = "CAPITAL-AI"
    disclaimer: str | None = None


@dataclass(frozen=True)
class FfmpegBuildInfo:
    executable: str
    version: str
    profile: str
    enable_gpl: bool
    enable_nonfree: bool
    buildconf_sha256: str


@dataclass(frozen=True)
class AssetRecord:
    path: str
    sha256: str
    mime_type: str
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    kind: str = "image"


@dataclass(frozen=True)
class VoiceoverBinding:
    audio_path: Path
    audio_sha256: str
    request_hash: str
    content_package_id: str
    candidate_content_hash: str
    runtime_evidence_reference: str
    license_evidence_reference: str
    listening_review_reference: str


def _token_value(node: Any) -> Any:
    if not isinstance(node, dict):
        return node
    value = node.get("$value", node.get("value"))
    if isinstance(value, dict) and "hex" in value:
        return value["hex"]
    return value


def load_brand_palette(token_path: Path = DEFAULT_TOKEN_PATH) -> BrandPalette:
    if not token_path.is_file():
        raise MediaRenderError(f"Design-token file not found: {token_path}")
    data = json.loads(token_path.read_text(encoding="utf-8"))
    color = data["color"]
    brand = color["brand"]
    print_tokens = color["print"]
    primary = str(_token_value(brand["primary"]))
    return BrandPalette(
        background=str(_token_value(color["background"])),
        foreground=str(_token_value(color["foreground"])),
        gold_light=primary,
        gold=primary,
        gold_dark=primary,
        gold_muted=primary,
        cyan=str(_token_value(brand["cyan"])),
        purple=str(_token_value(brand["accent"])),
        text_primary=str(_token_value(print_tokens["textPrimary"])),
        text_secondary=str(_token_value(print_tokens["textSecondary"])),
        surface_light=str(_token_value(print_tokens["surfaceLight"])),
        border_light=str(_token_value(print_tokens["borderLight"])),
    )


def normalize_text(value: Any, *, field: str, max_chars: int = MAX_TEXT_CHARS) -> str:
    if not isinstance(value, str):
        raise MediaRenderError(f"{field} must be a string")
    text = re.sub(r"\s+", " ", value).strip()
    if not text:
        raise MediaRenderError(f"{field} must not be empty")
    if len(text) > max_chars:
        raise MediaRenderError(f"{field} exceeds {max_chars} characters")
    return text


def validate_scenes(raw_scenes: Any) -> list[RenderScene]:
    if not isinstance(raw_scenes, list) or not raw_scenes:
        raise MediaRenderError("scenes must be a non-empty array")
    if len(raw_scenes) > MAX_SCENES:
        raise MediaRenderError(f"scenes exceeds maximum of {MAX_SCENES}")

    scenes: list[RenderScene] = []
    for index, raw in enumerate(raw_scenes, start=1):
        if not isinstance(raw, dict):
            raise MediaRenderError(f"scene {index} must be an object")
        try:
            duration = float(raw.get("durationSeconds"))
        except (TypeError, ValueError) as exc:
            raise MediaRenderError(f"scene {index} durationSeconds must be numeric") from exc
        if not math.isfinite(duration) or duration < 1.0 or duration > 20.0:
            raise MediaRenderError(f"scene {index} durationSeconds must be between 1 and 20")
        disclaimer = raw.get("disclaimer")
        scenes.append(
            RenderScene(
                title=normalize_text(raw.get("title"), field=f"scene {index} title", max_chars=90),
                body=normalize_text(raw.get("body"), field=f"scene {index} body", max_chars=MAX_TEXT_CHARS),
                duration_seconds=duration,
                kicker=normalize_text(raw.get("kicker", "CAPITAL-AI"), field=f"scene {index} kicker", max_chars=60),
                disclaimer=(
                    normalize_text(disclaimer, field=f"scene {index} disclaimer", max_chars=220)
                    if disclaimer is not None
                    else None
                ),
            )
        )

    total = sum(scene.duration_seconds for scene in scenes)
    if total < MIN_TOTAL_DURATION_SECONDS or total > MAX_TOTAL_DURATION_SECONDS:
        raise MediaRenderError(
            f"total scene duration must be between {MIN_TOTAL_DURATION_SECONDS:.0f} and "
            f"{MAX_TOTAL_DURATION_SECONDS:.0f} seconds (got {total:.1f})"
        )
    return scenes


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _required_sha256(value: Any, *, field: str) -> str:
    normalized = normalize_text(value, field=field, max_chars=64).lower()
    if not re.fullmatch(r"[0-9a-f]{64}", normalized):
        raise MediaRenderError(f"{field} must be a lowercase/hex SHA-256")
    return normalized


def validate_voiceover_binding(raw: Any, *, manifest_dir: Path) -> VoiceoverBinding | None:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise MediaRenderError("voiceover must be an object")

    if raw.get("acceptanceStatus") != "PASS":
        raise MediaRenderError("voiceover requires explicit Human/Owner listening acceptance PASS")

    audio_ref = normalize_text(raw.get("audioPath"), field="voiceover.audioPath", max_chars=240)
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", audio_ref):
        raise MediaRenderError("voiceover.audioPath must be a local relative path")
    relative = Path(audio_ref)
    if relative.is_absolute():
        raise MediaRenderError("voiceover.audioPath must be relative to the render manifest")
    root = manifest_dir.resolve()
    audio_path = (root / relative).resolve()
    if not audio_path.is_relative_to(root):
        raise MediaRenderError("voiceover.audioPath escapes the render manifest directory")
    if not audio_path.is_file():
        raise MediaRenderError(f"voiceover audio not found: {audio_ref}")

    expected_audio_sha = _required_sha256(raw.get("audioSha256"), field="voiceover.audioSha256")
    actual_audio_sha = sha256_file(audio_path)
    if actual_audio_sha != expected_audio_sha:
        raise MediaRenderError("voiceover audio SHA-256 mismatch")

    return VoiceoverBinding(
        audio_path=audio_path,
        audio_sha256=expected_audio_sha,
        request_hash=_required_sha256(raw.get("requestHash"), field="voiceover.requestHash"),
        content_package_id=normalize_text(
            raw.get("contentPackageId"), field="voiceover.contentPackageId", max_chars=160
        ),
        candidate_content_hash=_required_sha256(
            raw.get("candidateContentHash"), field="voiceover.candidateContentHash"
        ),
        runtime_evidence_reference=normalize_text(
            raw.get("runtimeEvidenceReference"),
            field="voiceover.runtimeEvidenceReference",
            max_chars=240,
        ),
        license_evidence_reference=normalize_text(
            raw.get("licenseEvidenceReference"),
            field="voiceover.licenseEvidenceReference",
            max_chars=240,
        ),
        listening_review_reference=normalize_text(
            raw.get("listeningReviewReference"),
            field="voiceover.listeningReviewReference",
            max_chars=240,
        ),
    )


def run_checked(argv: Sequence[str], *, timeout: int = SUBPROCESS_TIMEOUT_SECONDS) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            list(argv),
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
    except FileNotFoundError as exc:
        raise MediaRenderError(f"Required executable not found: {argv[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise MediaRenderError(f"Command timed out: {argv[0]}") from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip()[-1000:]
        raise MediaRenderError(f"Command failed ({argv[0]}): {detail}") from exc


def inspect_ffmpeg(executable: str = "ffmpeg") -> FfmpegBuildInfo:
    resolved = shutil.which(executable)
    if not resolved:
        raise MediaRenderError("FFmpeg executable not found")
    version_output = run_checked([resolved, "-hide_banner", "-version"]).stdout
    version_line = version_output.splitlines()[0].strip() if version_output else "unknown"
    build_output = run_checked([resolved, "-hide_banner", "-buildconf"]).stdout
    build_lower = build_output.lower()
    enable_nonfree = "--enable-nonfree" in build_lower
    enable_gpl = "--enable-gpl" in build_lower
    if enable_nonfree:
        profile = "nonfree-build-detected"
    elif enable_gpl:
        profile = "gpl-build-detected"
    else:
        profile = "lgpl-compatible-build-candidate"
    return FfmpegBuildInfo(
        executable=resolved,
        version=version_line,
        profile=profile,
        enable_gpl=enable_gpl,
        enable_nonfree=enable_nonfree,
        buildconf_sha256=hashlib.sha256(build_output.encode("utf-8")).hexdigest(),
    )


def enforce_ffmpeg_license_profile(info: FfmpegBuildInfo, *, allow_gpl_ffmpeg: bool = False) -> None:
    if info.enable_nonfree:
        raise MediaRenderError(
            "FFmpeg build contains --enable-nonfree and is refused. Use a reviewed redistributable build."
        )
    if info.enable_gpl and not allow_gpl_ffmpeg:
        raise MediaRenderError(
            "FFmpeg build contains --enable-gpl. Production profile requires a reviewed LGPL-compatible build; "
            "use --allow-gpl-ffmpeg only for local developer smoke tests."
        )


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
        ("LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"),
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        box = draw.textbbox((0, 0), candidate, font=font)
        if box[2] - box[0] <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = word
        else:
            lines.append(word)
            current = ""
    if current:
        lines.append(current)
    return lines


def _draw_network_emblem(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, palette: BrandPalette) -> None:
    nodes = [
        (0.50, 0.54, 0.078), (0.16, 0.14, 0.046), (0.54, 0.18, 0.034), (0.84, 0.13, 0.050),
        (0.20, 0.42, 0.034), (0.34, 0.48, 0.038), (0.86, 0.46, 0.043), (0.16, 0.82, 0.054),
        (0.50, 0.90, 0.040), (0.84, 0.80, 0.058),
    ]
    edges = [
        (0.16, 0.14, 0.34, 0.48, palette.gold), (0.34, 0.48, 0.16, 0.82, palette.gold),
        (0.16, 0.82, 0.50, 0.90, palette.gold), (0.50, 0.90, 0.84, 0.80, palette.gold),
        (0.84, 0.80, 0.86, 0.46, palette.gold), (0.86, 0.46, 0.84, 0.13, palette.gold),
        (0.84, 0.13, 0.54, 0.18, palette.gold), (0.54, 0.18, 0.50, 0.54, palette.gold),
        (0.50, 0.54, 0.50, 0.90, palette.gold), (0.50, 0.54, 0.34, 0.48, palette.gold),
        (0.50, 0.54, 0.86, 0.46, palette.gold), (0.16, 0.14, 0.84, 0.13, palette.cyan),
        (0.20, 0.42, 0.86, 0.46, palette.cyan), (0.50, 0.90, 0.20, 0.42, palette.cyan),
        (0.16, 0.14, 0.84, 0.80, palette.purple), (0.84, 0.13, 0.16, 0.82, palette.purple),
    ]
    h = int(size * 0.9)
    for x1, y1, x2, y2, color in edges:
        draw.line((x + x1 * size, y + y1 * h, x + x2 * size, y + y2 * h), fill=color, width=max(2, size // 90))
    for nx, ny, radius in nodes:
        r = max(2, int(radius * size))
        cx = int(x + nx * size)
        cy = int(y + ny * h)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=palette.gold, outline=palette.gold_dark, width=max(1, size // 180))


def _background(width: int, height: int, palette: BrandPalette) -> Image.Image:
    image = Image.new("RGB", (width, height), palette.background)
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    radius = int(min(width, height) * 0.32)
    gd.ellipse((-radius // 2, -radius // 3, radius, radius), fill=palette.purple + "44")
    gd.ellipse((width - radius, height - radius, width + radius // 3, height + radius // 3), fill=palette.cyan + "33")
    gd.ellipse((width // 2 - radius // 3, -radius // 2, width // 2 + radius, radius), fill=palette.gold + "24")
    glow = glow.filter(ImageFilter.GaussianBlur(max(18, min(width, height) // 18)))
    return Image.alpha_composite(image.convert("RGBA"), glow).convert("RGB")


def _fit_source_image(source: Path, box: tuple[int, int, int, int], palette: BrandPalette) -> Image.Image:
    with Image.open(source) as input_image:
        input_image.load()
        img = input_image.convert("RGB")
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    scale = min(bw / img.width, bh / img.height)
    target = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
    img = img.resize(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (bw, bh), palette.surface_light)
    canvas.paste(img, ((bw - img.width) // 2, (bh - img.height) // 2))
    return canvas


def render_brand_card(
    *,
    output_path: Path,
    width: int,
    height: int,
    title: str,
    subtitle: str,
    disclaimer: str,
    palette: BrandPalette,
    source_image: Path | None = None,
    kicker: str = "CAPITAL-AI",
) -> AssetRecord:
    title = normalize_text(title, field="title", max_chars=100)
    subtitle = normalize_text(subtitle, field="subtitle", max_chars=240)
    disclaimer = normalize_text(disclaimer, field="disclaimer", max_chars=220)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    image = _background(width, height, palette)
    draw = ImageDraw.Draw(image)
    pad = max(36, width // 24)
    emblem_size = max(82, min(width, height) // 8)
    _draw_network_emblem(draw, pad, pad, emblem_size, palette)

    brand_font = _font(max(28, width // 28), bold=True)
    draw.text((pad + emblem_size + 18, pad + emblem_size * 0.18), kicker, fill=palette.gold, font=brand_font)
    draw.line((pad, pad + emblem_size + 18, width - pad, pad + emblem_size + 18), fill=palette.gold, width=max(3, width // 360))

    content_top = pad + emblem_size + 48
    if source_image is not None:
        if not source_image.is_file():
            raise MediaRenderError(f"source image not found: {source_image}")
        if width / height > 1.2:
            source_box = (int(width * 0.57), content_top, width - pad, int(height * 0.78))
            text_width = int(width * 0.50) - pad
        else:
            source_box = (pad, int(height * 0.43), width - pad, int(height * 0.78))
            text_width = width - pad * 2
        preview = _fit_source_image(source_image, source_box, palette)
        image.paste(preview, (source_box[0], source_box[1]))
        draw.rounded_rectangle(source_box, radius=max(12, width // 80), outline=palette.gold_dark, width=max(2, width // 480))
    else:
        text_width = width - pad * 2

    title_font = _font(max(36, int(width / (19 if width / height > 1.2 else 16))), bold=True)
    body_font = _font(max(22, int(width / (35 if width / height > 1.2 else 31))))
    disclaimer_font = _font(max(16, width // 58))

    y = content_top
    for line in _wrap(draw, title, title_font, text_width):
        draw.text((pad, y), line, fill=palette.foreground, font=title_font)
        y += int(title_font.size * 1.16) if hasattr(title_font, "size") else 48
    y += max(12, height // 60)
    for line in _wrap(draw, subtitle, body_font, text_width):
        draw.text((pad, y), line, fill=palette.gold_light, font=body_font)
        y += int(body_font.size * 1.38) if hasattr(body_font, "size") else 32

    disclaimer_lines = _wrap(draw, disclaimer, disclaimer_font, width - pad * 2)
    disclaimer_y = height - pad - len(disclaimer_lines) * (getattr(disclaimer_font, "size", 18) + 7)
    draw.line((pad, disclaimer_y - 18, width - pad, disclaimer_y - 18), fill=palette.border_light, width=1)
    for line in disclaimer_lines:
        draw.text((pad, disclaimer_y), line, fill=palette.text_secondary, font=disclaimer_font)
        disclaimer_y += getattr(disclaimer_font, "size", 18) + 7

    image.save(output_path, format="PNG", optimize=True)
    return AssetRecord(
        path=output_path.name,
        sha256=sha256_file(output_path),
        mime_type="image/png",
        width=width,
        height=height,
        kind="image",
    )


def render_scene_frame(
    scene: RenderScene,
    *,
    output_path: Path,
    palette: BrandPalette,
    scene_index: int,
    scene_count: int,
    source_image: Path | None = None,
) -> AssetRecord:
    width, height = 1080, 1920
    image = _background(width, height, palette)
    draw = ImageDraw.Draw(image)
    pad = 72
    _draw_network_emblem(draw, pad, 70, 132, palette)
    draw.text((238, 105), scene.kicker, fill=palette.gold, font=_font(43, bold=True))
    draw.text((width - pad, 120), f"{scene_index:02d}/{scene_count:02d}", fill=palette.text_secondary, font=_font(28), anchor="ra")
    draw.line((pad, 235, width - pad, 235), fill=palette.gold, width=5)

    title_font = _font(78, bold=True)
    body_font = _font(43)
    disclaimer_font = _font(26)
    y = 310
    for line in _wrap(draw, scene.title, title_font, width - pad * 2):
        draw.text((pad, y), line, fill=palette.foreground, font=title_font)
        y += 94
    y += 28
    for line in _wrap(draw, scene.body, body_font, width - pad * 2):
        draw.text((pad, y), line, fill=palette.gold_light, font=body_font)
        y += 61

    if source_image is not None:
        box = (pad, max(y + 35, 930), width - pad, 1525)
        preview = _fit_source_image(source_image, box, palette)
        image.paste(preview, (box[0], box[1]))
        draw.rounded_rectangle(box, radius=22, outline=palette.gold_dark, width=4)

    if scene.disclaimer:
        lines = _wrap(draw, scene.disclaimer, disclaimer_font, width - pad * 2)
        dy = height - 170 - len(lines) * 40
        draw.line((pad, dy - 25, width - pad, dy - 25), fill=palette.border_light, width=2)
        for line in lines:
            draw.text((pad, dy), line, fill=palette.text_secondary, font=disclaimer_font)
            dy += 40

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG", optimize=True)
    return AssetRecord(
        path=output_path.name,
        sha256=sha256_file(output_path),
        mime_type="image/png",
        width=width,
        height=height,
        kind="short_video_frame",
    )


def render_short_video(
    frames: Sequence[tuple[Path, float]],
    *,
    output_path: Path,
    allow_gpl_ffmpeg: bool = False,
    voiceover: VoiceoverBinding | None = None,
    ffmpeg_executable: str = "ffmpeg",
    ffprobe_executable: str = "ffprobe",
) -> tuple[AssetRecord, FfmpegBuildInfo]:
    if not frames:
        raise MediaRenderError("at least one video frame is required")
    total_duration = sum(duration for _, duration in frames)
    if total_duration < MIN_TOTAL_DURATION_SECONDS or total_duration > MAX_TOTAL_DURATION_SECONDS:
        raise MediaRenderError("short video duration must be between 5 and 60 seconds")
    for path, duration in frames:
        if not path.is_file():
            raise MediaRenderError(f"video frame not found: {path}")
        if duration < 1 or duration > 20:
            raise MediaRenderError(f"invalid frame duration: {duration}")

    ffmpeg_info = inspect_ffmpeg(ffmpeg_executable)
    enforce_ffmpeg_license_profile(ffmpeg_info, allow_gpl_ffmpeg=allow_gpl_ffmpeg)
    ffprobe = shutil.which(ffprobe_executable)
    if not ffprobe:
        raise MediaRenderError("ffprobe executable not found")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="capital-ai-ffmpeg-") as temp_dir:
        concat_path = Path(temp_dir) / "frames.ffconcat"
        lines = ["ffconcat version 1.0"]
        for frame_path, duration in frames:
            path_text = str(frame_path.resolve())
            if "\n" in path_text or "\r" in path_text or "'" in path_text:
                raise MediaRenderError("generated frame path contains unsupported characters")
            lines.append(f"file '{path_text}'")
            lines.append(f"duration {duration:.3f}")
        last_path = str(frames[-1][0].resolve())
        lines.append(f"file '{last_path}'")
        concat_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        command = [
            ffmpeg_info.executable,
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-safe", "0",
            "-f", "concat",
            "-i", str(concat_path),
        ]
        if voiceover is not None:
            command += [
                "-i", str(voiceover.audio_path),
                "-map", "0:v:0",
                "-map", "1:a:0",
            ]
        command += [
            "-t", f"{total_duration:.3f}",
            "-vf", "fps=30,format=yuv420p",
            "-c:v", "mpeg4",
            "-q:v", "3",
        ]
        if voiceover is None:
            command += ["-an"]
        else:
            command += [
                "-af", f"apad,atrim=0:{total_duration:.3f}",
                "-c:a", "aac",
                "-b:a", "192k",
            ]
        command += ["-movflags", "+faststart", str(output_path)]
        run_checked(command, timeout=180)

    probe = run_checked(
        [
            ffprobe,
            "-v", "error",
            "-show_entries", "stream=codec_type,width,height:format=duration",
            "-of", "json",
            str(output_path),
        ]
    )
    info = json.loads(probe.stdout)
    streams = info.get("streams") or []
    video_streams = [stream for stream in streams if stream.get("codec_type") == "video"]
    audio_streams = [stream for stream in streams if stream.get("codec_type") == "audio"]
    if not video_streams:
        raise MediaRenderError("ffprobe returned no video stream")
    if voiceover is not None and len(audio_streams) != 1:
        raise MediaRenderError("voiceover render must contain exactly one audio stream")
    if voiceover is None and audio_streams:
        raise MediaRenderError("silent render unexpectedly contains an audio stream")
    width = int(video_streams[0].get("width", 0))
    height = int(video_streams[0].get("height", 0))
    duration = float((info.get("format") or {}).get("duration") or 0)
    if (width, height) != (1080, 1920):
        raise MediaRenderError(f"rendered short has invalid dimensions: {width}x{height}")
    if duration <= 0 or duration > MAX_TOTAL_DURATION_SECONDS + 0.5:
        raise MediaRenderError(f"rendered short has invalid duration: {duration:.3f}s")

    return (
        AssetRecord(
            path=output_path.name,
            sha256=sha256_file(output_path),
            mime_type="video/mp4",
            width=width,
            height=height,
            duration_seconds=round(duration, 3),
            kind="short_video",
        ),
        ffmpeg_info,
    )


def write_asset_manifest(
    *,
    output_path: Path,
    assets: Iterable[AssetRecord],
    palette: BrandPalette,
    source: dict[str, Any],
    renderer: dict[str, Any],
) -> Path:
    payload = {
        "schemaVersion": "1.0.0",
        "brand": "CAPITAL-AI",
        "publishReady": False,
        "publishingBoundary": "Requires existing SocialMediaEngine asset validation + hash-bound human approval before publish.",
        "source": source,
        "renderer": renderer,
        "palette": asdict(palette),
        "assets": [asdict(asset) for asset in assets],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return output_path


def safe_output_stem(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip("-._")
    return normalized[:80] or "capital-ai-media"


def mime_for(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"
