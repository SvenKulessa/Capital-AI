"""Evidence-only inventory for an EXACT unactivated worker image archive.

Does not publish, sign, attest a registry manifest or authorize redistribution.
SPDX records are preserved even when license identifiers are NOASSERTION.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

HEX40 = re.compile(r"[0-9a-f]{40}\Z")
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
IMAGE = re.compile(r"sha256:[0-9a-f]{64}\Z")
BASE = re.compile(r"(?:docker.io/)?bellsoft/hardened-python@sha256:[0-9a-f]{64}\Z")
MAX_SBOM_BYTES = 64 * 1024 * 1024


def _hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _read_sbom(path: Path) -> dict:
    if path.is_symlink() or not path.is_file():
        raise ValueError("SBOM must be a regular non-symlink file")
    if not 1 <= path.stat().st_size <= MAX_SBOM_BYTES:
        raise ValueError("SBOM size out of bounds")
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("invalid SBOM object")
    return data


def _pkg_license(value) -> str:
    if not isinstance(value, str) or not value.strip():
        return "NOASSERTION"
    return value.strip()


def build_inventory(*, archive: Path, cyclonedx: Path, spdx: Path,
                    image_id: str, source_sha: str, tested_checkout_sha: str,
                    builder_ref: str, runtime_ref: str) -> dict:
    """Generate digest-bound evidence. Never grant licensing or registry approval."""
    if not HEX40.fullmatch(source_sha) or not HEX40.fullmatch(tested_checkout_sha):
        raise ValueError("expected source SHA-1")
    if not IMAGE.fullmatch(image_id):
        raise ValueError("expected image config sha256 ID")
    if not BASE.fullmatch(builder_ref) or not BASE.fullmatch(runtime_ref):
        raise ValueError("expected immutable BellSoft OCI base references")
    if archive.is_symlink() or not archive.is_file() or archive.stat().st_size == 0:
        raise ValueError("expected nonempty local image archive")
    cdx = _read_sbom(cyclonedx)
    sx = _read_sbom(spdx)
    if (cdx.get("bomFormat") != "CycloneDX"
            or not isinstance(cdx.get("components"), list) or not cdx["components"]
            or not str(cdx.get("specVersion", "")).startswith("1.")):
        raise ValueError("missing CycloneDX components")
    if (not str(sx.get("spdxVersion", "")).startswith("SPDX-")
            or not isinstance(sx.get("packages"), list) or not sx["packages"]):
        raise ValueError("missing SPDX packages")

    packages = []
    seen_ids = set()
    for package in sx["packages"]:
        if not isinstance(package, dict):
            raise ValueError("invalid SPDX package")
        key = package.get("SPDXID")
        name = package.get("name")
        if (not isinstance(key, str) or not key.startswith("SPDXRef-")
                or key in seen_ids or not isinstance(name, str) or not name.strip()):
            raise ValueError("ambiguous SPDX package identity")
        seen_ids.add(key)
        declared = _pkg_license(package.get("licenseDeclared"))
        concluded = _pkg_license(package.get("licenseConcluded"))
        packages.append({
            "spdxId": key,
            "name": name,
            "version": package.get("versionInfo", "NOASSERTION"),
            "licenseDeclared": declared,
            "licenseConcluded": concluded,
            "downloadLocation": package.get("downloadLocation", "NOASSERTION"),
            "copyrightText": package.get("copyrightText", "NOASSERTION"),
            "licenseMetadataUnresolved": (
                declared in ("NOASSERTION", "NONE")
                and concluded in ("NOASSERTION", "NONE")
            ),
        })
    if len(packages) > 20000:
        raise ValueError("unreasonable SBOM package count")
    packages.sort(key=lambda p: (p["name"], p["spdxId"]))
    unresolved = sum(p["licenseMetadataUnresolved"] for p in packages)
    return {
        "schema": "CAPITAL_AI_WORKER_OCI_LICENSE_EVIDENCE@1",
        "sourceHeadSha": source_sha,
        "testedCheckoutSha": tested_checkout_sha,
        "imageConfigId": image_id,
        "imageArchiveSha256": _hash(archive),
        "sbom": {
            "cyclonedxSha256": _hash(cyclonedx),
            "spdxSha256": _hash(spdx),
            "cyclonedxComponents": len(cdx["components"]),
            "spdxPackages": len(packages),
        },
        "immutableInputs": {
            "builder": builder_ref,
            "runtime": runtime_ref,
        },
        "licenseSummary": {
            "spdxPackages": len(packages),
            "unresolvedMetadataCount": unresolved,
            "allPackagesRequireRightsAssessment": True,
        },
        "packages": packages,
        "derivedRegistryManifestDigest": None,
        "upstreamSignatureVerified": False,
        "upstreamAttestationVerified": False,
        "componentNoticesVerified": False,
        "sourceOfferComplianceVerified": False,
        "commercialRedistributionAuthorized": False,
        "ghcrPublishingAuthorized": False,
        "renderWorkerActivationAuthorized": False,
        "status": "INVENTORIED_REVIEW_REQUIRED",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    for name in ("archive", "cyclonedx", "spdx", "image-id", "source-sha", "tested-checkout-sha",
                 "builder-ref", "runtime-ref", "output"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    report = build_inventory(
        archive=Path(args.archive), cyclonedx=Path(args.cyclonedx),
        spdx=Path(args.spdx), image_id=args.image_id,
        source_sha=args.source_sha, tested_checkout_sha=args.tested_checkout_sha,
        builder_ref=args.builder_ref,
        runtime_ref=args.runtime_ref,
    )
    output = Path(args.output)
    if output.is_symlink():
        raise ValueError("report output must not be a symlink")
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n",
                      encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "imageConfigId": report["imageConfigId"],
        "spdxPackages": report["sbom"]["spdxPackages"],
        "unresolvedMetadata": report["licenseSummary"]["unresolvedMetadataCount"],
        "commercialRedistributionAuthorized": False,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
