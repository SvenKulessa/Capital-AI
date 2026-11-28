"""Repackage a pinned private Acode RC with owner-approved draft branding only."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

FILES = {"plugin.json", "main.js", "readme.md", "changelogs.md", "icon.png"}
ID = "online.capitalai.acopybridge"

def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(source, icon, target, config):
    if (config["pluginId"] != ID or config["productId"] != "ai-smartcopy"
            or config["command"] != "acopy" or config["displayName"] != "CAPITAL-AI TerminalCopy"
            or config["commercialRelease"] != "HOLD" or config["publicPublishAllowed"] is not False
            or config["price"] != 0 or config["license"] != "UNLICENSED"
            or config["catalogDraft"]["checkoutAllowed"] is not False
            or config["catalogDraft"]["publicListingAllowed"] is not False
            or config["catalogDraft"]["priceChangeAllowed"] is not False):
        raise ValueError("PRIVATE_RC_BOUNDARY")
    if config["website"] != "https://capital-ai.online/" or config["pricingCatalog"] != "https://capital-ai.online/pricing":
        raise ValueError("LINK_BOUNDARY")
    raw, png = source.read_bytes(), icon.read_bytes()
    logo = config["productLogo"]
    if digest(raw) != config["baseZipSha256"]:
        raise ValueError("BASE_SHA_MISMATCH")
    if digest(png) != logo["iconSha256"] or len(png) > 50000 or not png.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("ICON_SHA_OR_FORMAT")
    with ZipFile(source) as archive:
        if len(archive.namelist()) != len(FILES) or set(archive.namelist()) != FILES:
            raise ValueError("ARCHIVE_LAYOUT")
        files = {name: archive.read(name) for name in FILES}
    manifest = json.loads(files["plugin.json"])
    if manifest["id"] != ID or manifest["version"] != config["baseVersion"] or manifest["price"] != 0:
        raise ValueError("BASE_ID_VERSION_OR_PRICE")
    old, new, name = config["baseVersion"], config["version"], config["displayName"]
    if (old, new) != ("1.3.3", "1.3.4"):
        raise ValueError("VERSION_BOUNDARY")
    main = files["main.js"].decode()
    marker = f"VERSION='{old}', NAME='AI-Smartcopy'"
    if main.count(marker) != 1:
        raise ValueError("RUNTIME_MARKER")
    files["main.js"] = main.replace(marker, f"VERSION='{new}', NAME='{name}'").encode()
    manifest.update(name=name, version=new, author=config["author"], license="UNLICENSED",
                    keywords=["terminal", "clipboard", "acodex", "shell", "exit-code", "acti"])
    files["plugin.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    files["icon.png"] = png
    readme = files["readme.md"].decode().replace("AI-Smartcopy", name).replace(old, new)
    readme += ("\n## Branding und Rechte\nVorläufiger Produktname. Keine öffentliche Freigabe. "
               "Die Marken- und Bildrechteprüfung ist noch offen. Keine Verbindung zu Google oder Acode behauptet.\n\n"
               + logo["attribution"] + "\nhttps://creativecommons.org/licenses/by/3.0/\n")
    files["readme.md"] = readme.encode()
    files["changelogs.md"] = ("## 1.3.4 — Private RC\nVorläufiger Produktname und Owner-Logo; technische IDs unverändert; Commercial HOLD.\n\n" + files["changelogs.md"].decode()).encode()
    with ZipFile(target, "x", compression=ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            info = ZipInfo(name, (2026, 11, 28, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, data)
    return digest(target.read_bytes())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("source", "icon", "target", "config"):
        parser.add_argument(arg, type=Path)
    args = parser.parse_args()
    print("PRIVATE_RC_SHA256=" + build(args.source, args.icon, args.target, json.loads(args.config.read_text())))
