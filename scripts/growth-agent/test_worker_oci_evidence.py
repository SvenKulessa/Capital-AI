"""Synthetic negative tests for Worker OCI SPDX/CycloneDX evidence."""
import json
from pathlib import Path
import tempfile
import unittest

from worker_oci_evidence import build_inventory

SHA = "a" * 40
IMAGE = "sha256:" + "b" * 64
BUILDER = "bellsoft/hardened-python@sha256:" + "c" * 64
RUNTIME = "bellsoft/hardened-python@sha256:" + "d" * 64


class WorkerOCIInventoryTests(unittest.TestCase):
    def fixture(self, temp):
        root = Path(temp)
        archive = root / "candidate.tar"
        archive.write_bytes(b"synthetic archive content (not an OCI image)")
        cdx = root / "sbom.cdx.json"
        cdx.write_text(json.dumps({"bomFormat": "CycloneDX", "specVersion": "1.6",
                                   "components": [{"name": "sqlite-vec", "version": "0.1.9"}]}))
        spdx = root / "sbom.spdx.json"
        spdx.write_text(json.dumps({
            "spdxVersion": "SPDX-2.3",
            "packages": [
                {"SPDXID": "SPDXRef-Package-A", "name": "sqlite-vec",
                 "versionInfo": "0.1.9", "licenseDeclared": "MIT",
                 "licenseConcluded": "NOASSERTION"},
                {"SPDXID": "SPDXRef-Package-B", "name": "unresolved-os-package",
                 "versionInfo": "1", "licenseDeclared": "NOASSERTION",
                 "licenseConcluded": "NOASSERTION"},
            ],
        }))
        os_inventory = root / "os-packages.json"
        os_inventory.write_text(json.dumps({
            "schema": "CAPITAL_AI_WORKER_APK_LICENSES@1",
            "status": "APK_METADATA_FOUND",
            "packages": [{"name": "python3", "version": "3.14",
                          "license": "PSF-2.0", "origin": "python3"}],
        }))
        return {"archive": archive, "cyclonedx": cdx, "spdx": spdx,
                "os_inventory": os_inventory,
                "image_id": IMAGE, "source_sha": SHA,
                "tested_checkout_sha": "e" * 40,
                "builder_ref": BUILDER, "runtime_ref": RUNTIME}

    def test_complete_inventory_is_never_authorization(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = build_inventory(**self.fixture(tmp))
            self.assertEqual(data["sourceHeadSha"], SHA)
            self.assertEqual(data["testedCheckoutSha"], "e" * 40)
            self.assertEqual(data["sbom"]["spdxPackages"], 2)
            self.assertEqual(data["licenseSummary"]["osPackageCount"], 1)
            self.assertEqual(data["osPackages"][0]["name"], "python3")
            self.assertEqual(len(data["packages"]), 2)
            self.assertEqual(data["licenseSummary"]["unresolvedMetadataCount"], 1)
            self.assertEqual(data["status"], "INVENTORIED_REVIEW_REQUIRED")
            self.assertFalse(data["commercialRedistributionAuthorized"])
            self.assertFalse(data["ghcrPublishingAuthorized"])
            self.assertFalse(data["renderWorkerActivationAuthorized"])
            self.assertIsNone(data["derivedRegistryManifestDigest"])

    def test_invalid_identifier_never_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(tmp)
            for name, wrong in [
                ("source_sha", "main"), ("tested_checkout_sha", "main"),
                ("image_id", "sha256:bad"),
                ("builder_ref", "bellsoft/hardened-python:latest"),
                ("runtime_ref", "python:3.14-alpine"),
            ]:
                altered = dict(args, **{name: wrong})
                with self.assertRaises(ValueError):
                    build_inventory(**altered)

    def test_missing_or_empty_sbom_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(tmp)
            args["spdx"].write_text('{"spdxVersion":"SPDX-2.3","packages":[]}')
            with self.assertRaises(ValueError):
                build_inventory(**args)

    def test_duplicate_spdx_identifiers_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(tmp)
            obj = json.loads(args["spdx"].read_text())
            obj["packages"].append(dict(obj["packages"][0]))
            args["spdx"].write_text(json.dumps(obj))
            with self.assertRaises(ValueError):
                build_inventory(**args)

    def test_stripped_apk_database_is_explicit_not_proven(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(tmp)
            args["os_inventory"].write_text(json.dumps({
                "schema": "CAPITAL_AI_WORKER_APK_LICENSES@1",
                "status": "APK_METADATA_NOT_PROVEN", "packages": [],
            }))
            data = build_inventory(**args)
            self.assertEqual(data["licenseSummary"]["osPackageMetadataStatus"],
                             "APK_METADATA_NOT_PROVEN")
            self.assertEqual(data["licenseSummary"]["osPackageCount"], 0)
            self.assertFalse(data["commercialRedistributionAuthorized"])

    def test_sbom_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.fixture(tmp)
            orig = args["spdx"]
            other = Path(tmp) / "other.json"
            orig.replace(other)
            orig.symlink_to(other)
            with self.assertRaises(ValueError):
                build_inventory(**args)


if __name__ == "__main__":
    unittest.main()
