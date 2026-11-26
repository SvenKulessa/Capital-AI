#!/usr/bin/env python3
"""Generate the CAPITAL-AI first-party branding asset pack.

Source of truth:
  public/branding/capital-ai-logo.jpg
Expected source SHA-256:
  6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3

This generator uses no remote visual assets. It creates only deterministic
format/size projections of the owner-provided master artwork. It has no
publishing or provider-mutation authority.
"""

from __future__ import annotations

from PIL import Image, ImageOps, ImageFilter, ImageEnhance
from pathlib import Path
import base64
import hashlib
import io
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public" / "branding" / "capital-ai-logo.jpg"
OUT = ROOT / "public" / "branding" / "asset-pack"
EXPECTED_SOURCE_SHA256 = "6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3"
EXPECTED_SIZE = (1536, 864)
BG = (3, 15, 24)


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def save_jpg(image: Image.Image, path: Path, quality: int = 92) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def save_webp(image: Image.Image, path: Path, quality: int = 92) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "WEBP", quality=quality, method=6)


def contain(image: Image.Image, size: tuple[int, int], margin_fraction: float = 0.0) -> Image.Image:
    width, height = size
    margin = int(min(width, height) * margin_fraction)
    inner = (max(1, width - 2 * margin), max(1, height - 2 * margin))
    fitted = ImageOps.contain(image, inner, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, BG)
    canvas.paste(fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2))
    return canvas


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))


def blurred_backdrop(image: Image.Image, size: tuple[int, int], blur_radius: int, darken: float) -> Image.Image:
    backdrop = cover(image, size).filter(ImageFilter.GaussianBlur(blur_radius))
    return ImageEnhance.Brightness(backdrop).enhance(darken)


def portrait_card(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = blurred_backdrop(image, size, max(10, min(size) // 45), 0.34)
    inner = ImageOps.contain(image, (int(size[0] * 0.92), int(size[1] * 0.78)), Image.Resampling.LANCZOS)
    frame = Image.new("RGB", (inner.width + 18, inner.height + 18), (1, 9, 15))
    frame.paste(inner, (9, 9))
    canvas.paste(frame, ((size[0] - frame.width) // 2, (size[1] - frame.height) // 2))
    return canvas


def wide_banner(image: Image.Image, emblem_crop: Image.Image, wordmark_crop: Image.Image, size: tuple[int, int]) -> Image.Image:
    width, height = size
    canvas = blurred_backdrop(image, size, max(12, height // 28), 0.35)
    emblem = ImageOps.contain(emblem_crop, (int(width * 0.24), int(height * 0.78)), Image.Resampling.LANCZOS)
    wordmark = ImageOps.contain(wordmark_crop, (int(width * 0.68), int(height * 0.48)), Image.Resampling.LANCZOS)
    gap = int(width * 0.025)
    total = emblem.width + gap + wordmark.width
    x = max(int(width * 0.04), (width - total) // 2)
    canvas.paste(emblem, (x, (height - emblem.height) // 2))
    canvas.paste(wordmark, (x + emblem.width + gap, (height - wordmark.height) // 2))
    return canvas


def youtube_banner(image: Image.Image, emblem_crop: Image.Image, wordmark_crop: Image.Image) -> Image.Image:
    size = (2560, 1440)
    canvas = blurred_backdrop(image, size, 32, 0.32)
    emblem = ImageOps.contain(emblem_crop, (330, 330), Image.Resampling.LANCZOS)
    wordmark = ImageOps.contain(wordmark_crop, (1080, 230), Image.Resampling.LANCZOS)
    total = emblem.width + 34 + wordmark.width
    x = size[0] // 2 - total // 2
    canvas.paste(emblem, (x, size[1] // 2 - emblem.height // 2))
    canvas.paste(wordmark, (x + emblem.width + 34, size[1] // 2 - wordmark.height // 2))
    return canvas


def svg_embed_png(image: Image.Image, path: Path, width: int, height: int, title: str) -> None:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="{title}">\n'
        f'  <title>{title}</title>\n'
        f'  <image width="{width}" height="{height}" href="data:image/png;base64,{payload}" '
        f'preserveAspectRatio="xMidYMid meet"/>\n'
        f'</svg>\n',
        encoding="utf-8",
    )


def record(records: list[dict], path: Path, category: str, purpose: str, dimensions=None, notes=None) -> None:
    mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".json": "application/json",
        ".txt": "text/plain",
        ".md": "text/markdown",
    }.get(path.suffix.lower(), "application/octet-stream")
    records.append({
        "path": path.relative_to(OUT).as_posix(),
        "category": category,
        "purpose": purpose,
        "dimensions": list(dimensions) if dimensions else None,
        "mime": mime,
        "bytes": path.stat().st_size,
        "sha256": digest(path),
        "notes": notes,
    })


def main() -> int:
    if not SOURCE.is_file():
        raise SystemExit(f"missing source: {SOURCE}")
    source_sha = digest(SOURCE)
    if source_sha != EXPECTED_SOURCE_SHA256:
        raise SystemExit(f"source SHA-256 mismatch: {source_sha}")

    image = Image.open(SOURCE).convert("RGB")
    if image.size != EXPECTED_SIZE:
        raise SystemExit(f"unexpected source dimensions: {image.size}")

    if OUT.exists():
        shutil.rmtree(OUT)
    for name in ("master", "social", "avatars", "banners", "favicon", "svg", "vendor", "meta"):
        (OUT / name).mkdir(parents=True, exist_ok=True)

    emblem_crop = image.crop((300, 15, 1235, 590))
    wordmark_crop = image.crop((55, 565, 1490, 745))
    records: list[dict] = []

    master_jpg = OUT / "master" / "capital-ai-online-master-1536x864.jpg"
    shutil.copyfile(SOURCE, master_jpg)
    record(records, master_jpg, "master", "Byte-identical owner-provided JPEG master", image.size)

    master_png = OUT / "master" / "capital-ai-online-master-1536x864.png"
    save_png(image, master_png)
    record(records, master_png, "master", "Lossless PNG projection of the master", image.size)

    master_webp = OUT / "master" / "capital-ai-online-master-1536x864.webp"
    save_webp(image, master_webp)
    record(records, master_webp, "master", "WebP projection of the master", image.size)

    def avatar(size: int, maskable: bool = False) -> Image.Image:
        return contain(emblem_crop, (size, size), 0.14 if maskable else 0.07)

    social_specs = [
        ("engine-landscape-1920x1080", (1920, 1080), "Finance SocialMediaEngine 16:9 landscape profile"),
        ("youtube-thumbnail-1280x720", (1280, 720), "YouTube / SocialMediaEngine thumbnail profile"),
        ("open-graph-1200x630", (1200, 630), "Open Graph / link preview"),
        ("x-link-card-1200x675", (1200, 675), "X / general 16:9 social card"),
        ("instagram-square-1080x1080", (1080, 1080), "Instagram / SocialMediaEngine square profile"),
        ("instagram-portrait-1080x1350", (1080, 1350), "Instagram portrait / SocialMediaEngine 4:5 profile"),
        ("story-reel-1080x1920", (1080, 1920), "Instagram Story / Reel / vertical SocialMediaEngine profile"),
    ]
    for name, size, purpose in social_specs:
        ratio = size[0] / size[1]
        if ratio > 1.65:
            rendered = cover(image, size) if abs(ratio - 16 / 9) < 0.06 else wide_banner(image, emblem_crop, wordmark_crop, size)
        else:
            rendered = portrait_card(image, size)
        png = OUT / "social" / f"{name}.png"
        jpg = OUT / "social" / f"{name}.jpg"
        save_png(rendered, png)
        save_jpg(rendered, jpg)
        record(records, png, "social", purpose, size)
        record(records, jpg, "social", f"{purpose} (JPEG)", size)

    for size in (1024, 512, 400, 320, 256, 128, 120, 64):
        rendered = avatar(size)
        png = OUT / "avatars" / f"capital-ai-avatar-{size}x{size}.png"
        save_png(rendered, png)
        record(records, png, "avatar", f"Square avatar {size}px", (size, size))
        if size in (512, 256, 120):
            webp = OUT / "avatars" / f"capital-ai-avatar-{size}x{size}.webp"
            save_webp(rendered, webp)
            record(records, webp, "avatar", f"Square avatar {size}px WebP", (size, size))

    for size in (192, 512):
        rendered = avatar(size, maskable=True)
        png = OUT / "avatars" / f"capital-ai-maskable-{size}x{size}.png"
        save_png(rendered, png)
        record(records, png, "avatar", f"Maskable / PWA-safe icon {size}px", (size, size))

    google = avatar(120)
    google_png = OUT / "vendor" / "google-oauth-app-logo-120x120.png"
    google_jpg = OUT / "vendor" / "google-oauth-app-logo-120x120.jpg"
    save_png(google, google_png)
    save_jpg(google, google_jpg, quality=95)
    record(records, google_png, "vendor", "Google OAuth consent-screen app logo", (120, 120),
           "First-party CAPITAL-AI artwork only; no Google trademark inserted.")
    record(records, google_jpg, "vendor", "Google OAuth app logo JPEG", (120, 120))

    for size in (128, 256, 512, 1024):
        rendered = avatar(size)
        png = OUT / "vendor" / f"vendor-app-icon-{size}x{size}.png"
        save_png(rendered, png)
        record(records, png, "vendor", f"Generic vendor/application icon {size}px", (size, size))
        if size in (256, 512):
            webp = OUT / "vendor" / f"vendor-app-icon-{size}x{size}.webp"
            save_webp(rendered, webp)
            record(records, webp, "vendor", f"Generic vendor/application icon {size}px WebP", (size, size))

    vendor_banner = wide_banner(image, emblem_crop, wordmark_crop, (1200, 300))
    for ext in ("png", "jpg"):
        path = OUT / "vendor" / f"vendor-brand-banner-1200x300.{ext}"
        (save_png if ext == "png" else save_jpg)(vendor_banner, path)
        record(records, path, "vendor", f"Generic vendor integration banner ({ext.upper()})", (1200, 300))

    banner_specs = [
        ("x-profile-header-1500x500", (1500, 500), "X profile header"),
        ("linkedin-profile-banner-1584x396", (1584, 396), "LinkedIn profile background"),
        ("facebook-cover-1640x624", (1640, 624), "Facebook cover"),
        ("profile-banner-1920x480", (1920, 480), "Generic website/profile banner"),
    ]
    for name, size, purpose in banner_specs:
        rendered = wide_banner(image, emblem_crop, wordmark_crop, size)
        for ext in ("png", "jpg"):
            path = OUT / "banners" / f"{name}.{ext}"
            (save_png if ext == "png" else save_jpg)(rendered, path)
            record(records, path, "banner", f"{purpose} ({ext.upper()})", size)

    yt = youtube_banner(image, emblem_crop, wordmark_crop)
    for ext in ("png", "jpg"):
        path = OUT / "banners" / f"youtube-channel-banner-2560x1440.{ext}"
        (save_png if ext == "png" else save_jpg)(yt, path)
        record(records, path, "banner", f"YouTube channel banner ({ext.upper()})", (2560, 1440),
               "Core lockup kept inside the centered cross-device safe region.")

    for size in (16, 32, 48, 64, 96, 180, 192, 256, 512):
        rendered = avatar(size, maskable=size >= 192)
        name = "apple-touch-icon-180x180.png" if size == 180 else f"favicon-{size}x{size}.png"
        path = OUT / "favicon" / name
        save_png(rendered, path)
        record(records, path, "favicon", "Apple touch icon" if size == 180 else f"Favicon {size}px", (size, size))

    ico = OUT / "favicon" / "favicon.ico"
    avatar(512).save(ico, format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
    record(records, ico, "favicon", "Multi-resolution ICO")

    svg_master = OUT / "svg" / "capital-ai-online-logo-raster-preserving.svg"
    svg_embed_png(image, svg_master, 1536, 864, "CAPITAL-AI.ONLINE master logo")
    record(records, svg_master, "svg", "Raster-preserving SVG wrapper", (1536, 864),
           "Exact visual source embedded as PNG; intentionally not presented as native vector tracing.")

    svg_avatar = OUT / "svg" / "capital-ai-avatar-raster-preserving.svg"
    svg_embed_png(avatar(512), svg_avatar, 512, 512, "CAPITAL-AI avatar")
    record(records, svg_avatar, "svg", "Raster-preserving square SVG avatar", (512, 512))

    favicon_svg = OUT / "favicon" / "favicon.svg"
    svg_embed_png(avatar(512, maskable=True), favicon_svg, 512, 512, "CAPITAL-AI favicon")
    record(records, favicon_svg, "favicon", "Raster-preserving SVG favicon", (512, 512))

    webmanifest = {
        "name": "CAPITAL-AI.ONLINE",
        "short_name": "CAPITAL-AI",
        "icons": [
            {"src": "favicon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "favicon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "../avatars/capital-ai-maskable-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": "../avatars/capital-ai-maskable-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "theme_color": "#030F18",
        "background_color": "#030F18",
        "display": "standalone",
    }
    manifest_path = OUT / "favicon" / "site.webmanifest"
    manifest_path.write_text(json.dumps(webmanifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    record(records, manifest_path, "favicon", "PWA icon manifest")

    license_text = f"""CAPITAL-AI Logo Asset Pack — provenance and rights handling

Source of truth:
- public/branding/capital-ai-logo.jpg
- dimensions: 1536x864
- SHA-256: {source_sha}

Rights basis:
- The project owner supplied the source artwork for use as CAPITAL-AI branding.
- The repository's canonical branding rights statement is docs/licenses/Capital-AI-BRANDING.md.
- No general license for third-party reuse of CAPITAL-AI branding is granted by this asset pack.
- Software dependency licenses remain separate and are not changed by these image derivatives.

Derivation:
- No third-party logos, stock graphics, remote images, or downloaded visual assets are inserted.
- Derivatives use only resizing, cropping, composition, blur/darken background projection, and format conversion of the same first-party source.
- SVG variants are raster-preserving wrappers, not claimed native vector reconstructions.
- Vendor-specific files contain CAPITAL-AI artwork only; vendor names describe intended upload slots and do not imply affiliation or vendor trademark use.
- Asset creation does not authorize external publishing, provider changes, OAuth configuration, or IAM changes.

Generator:
- scripts/branding/generate_logo_asset_pack.py
- Pillow version is recorded in meta/generation-environment.json.
"""
    provenance = OUT / "meta" / "ASSET-LICENSE-AND-PROVENANCE.txt"
    provenance.write_text(license_text, encoding="utf-8")
    record(records, provenance, "metadata", "Asset provenance and rights handling")

    environment = OUT / "meta" / "generation-environment.json"
    import PIL
    environment.write_text(json.dumps({
        "generator": "scripts/branding/generate_logo_asset_pack.py",
        "pillowVersion": PIL.__version__,
        "sourceSha256": source_sha,
        "sourceDimensions": list(image.size),
        "remoteVisualAssetsUsed": False,
        "publishReady": False,
    }, indent=2) + "\n", encoding="utf-8")
    record(records, environment, "metadata", "Generation environment")

    readme = OUT / "README.md"
    readme.write_text(
        "# CAPITAL-AI Branding Asset Pack\n\n"
        "Generated solely from public/branding/capital-ai-logo.jpg. "
        "The source SHA-256 is pinned in the generator and must match before any derivative is produced.\n\n"
        "The pack contains SocialMediaEngine-aligned social formats, avatar/profile variants, banners, "
        "Google OAuth upload artwork, generic vendor application graphics, favicon/PWA formats, and "
        "raster-preserving SVG wrappers.\n\n"
        "Rights/provenance: see meta/ASSET-LICENSE-AND-PROVENANCE.txt and "
        "docs/licenses/Capital-AI-BRANDING.md. No third-party visual assets are included.\n",
        encoding="utf-8",
    )
    record(records, readme, "metadata", "Pack documentation")

    asset_manifest = OUT / "meta" / "asset-manifest.json"
    manifest = {
        "schemaVersion": "1.0.0",
        "brand": "CAPITAL-AI.ONLINE",
        "publishReady": False,
        "source": {
            "repositoryPath": "public/branding/capital-ai-logo.jpg",
            "width": 1536,
            "height": 864,
            "sha256": source_sha,
            "rightsReference": "docs/licenses/Capital-AI-BRANDING.md",
        },
        "derivation": {
            "thirdPartyVisualAssetsAdded": False,
            "nativeVectorTraceClaimed": False,
            "svgMode": "raster-preserving embedded PNG",
            "financeSocialMediaEngineAlignedProfiles": [
                "1920x1080", "1280x720", "1080x1080", "1080x1350", "1080x1920"
            ],
        },
        "assets": records,
    }
    asset_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    required = {
        "social/engine-landscape-1920x1080.png": (1920, 1080),
        "social/instagram-square-1080x1080.png": (1080, 1080),
        "social/instagram-portrait-1080x1350.png": (1080, 1350),
        "social/story-reel-1080x1920.png": (1080, 1920),
        "vendor/google-oauth-app-logo-120x120.png": (120, 120),
        "favicon/favicon-48x48.png": (48, 48),
    }
    dimension_failures = []
    for relative, expected in required.items():
        actual = Image.open(OUT / relative).size
        if actual != expected:
            dimension_failures.append({"path": relative, "actual": actual, "expected": expected})

    oauth = OUT / "vendor" / "google-oauth-app-logo-120x120.png"
    ico_ok = True
    try:
        probe = Image.open(ico)
        probe.load()
    except Exception:
        ico_ok = False
    favicon_svg_text = favicon_svg.read_text(encoding="utf-8")
    svg_ok = "<svg" in favicon_svg_text and "data:image/png;base64," in favicon_svg_text

    hash_failures = []
    for asset in manifest["assets"]:
        path = OUT / asset["path"]
        if not path.exists() or digest(path) != asset["sha256"]:
            hash_failures.append(asset["path"])

    validations = [
        {"step": 1, "name": "source_integrity", "status": "PASS",
         "evidence": {"dimensions": list(image.size), "sha256": source_sha}},
        {"step": 2, "name": "required_dimensions",
         "status": "PASS" if not dimension_failures else "FAIL",
         "evidence": {"checked": len(required), "failures": dimension_failures}},
        {"step": 3, "name": "google_oauth_asset",
         "status": "PASS" if Image.open(oauth).size == (120, 120) and oauth.stat().st_size <= 1_000_000 else "FAIL",
         "evidence": {"dimensions": list(Image.open(oauth).size), "bytes": oauth.stat().st_size, "maxBytes": 1_000_000}},
        {"step": 4, "name": "favicon_svg_structure",
         "status": "PASS" if ico_ok and svg_ok else "FAIL",
         "evidence": {"icoReadable": ico_ok, "svgEmbeddedRaster": svg_ok}},
        {"step": 5, "name": "manifest_hash_readback",
         "status": "PASS" if not hash_failures else "FAIL",
         "evidence": {"assetsChecked": len(manifest["assets"]), "failures": hash_failures}},
    ]
    report = OUT / "meta" / "validation-report.json"
    report.write_text(json.dumps({"validation": validations}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if any(item["status"] != "PASS" for item in validations):
        raise SystemExit("asset validation failed")

    sums = OUT / "meta" / "SHA256SUMS.txt"
    lines = []
    for path in sorted(p for p in OUT.rglob("*") if p.is_file() and p != sums):
        lines.append(f"{digest(path)}  {path.relative_to(OUT).as_posix()}")
    sums.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps({
        "sourceSha256": source_sha,
        "assetRecords": len(records),
        "files": len([p for p in OUT.rglob("*") if p.is_file()]),
        "validation": validations,
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
