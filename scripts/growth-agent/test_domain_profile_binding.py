"""Pure-stdlib TRUST/QUALITY negative cases for five offline SOLO2 profiles."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from domain_profile_binding import (APP, DOMAINS, PROFILES, REGISTRY, SOURCES,
                                    load_domain_profiles)

REPO = Path(__file__).resolve().parents[2]


def copy_bundle(destination: Path) -> None:
    for relative in SOURCES:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO / relative, target)


class ProfileBindingTests(unittest.TestCase):
    def temporary_bundle(self):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        copy_bundle(root)
        return tmp, root

    def edit(self, root: Path, relative: str, transform):
        path = root / relative
        doc = json.loads(path.read_text(encoding="utf-8"))
        transform(doc)
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")

    def test_all_five_profiles_are_scoped_read_only_and_digest_bound(self):
        bundle = load_domain_profiles(REPO)
        self.assertEqual(set(bundle["domains"]), set(DOMAINS))
        self.assertRegex(bundle["bundle_sha256"], r"^[a-f0-9]{64}$")
        self.assertFalse(bundle["permission_expansion"])
        self.assertFalse(bundle["provider_access"])
        for domain in DOMAINS:
            selected = bundle["domains"][domain]
            self.assertRegex(selected["profile_sha256"], r"^[a-f0-9]{64}$")
            self.assertEqual(selected["skills"], [domain.lower() + "-engineering",
                                                  domain.lower() + "-advisory"])

    def test_deterministic_and_profile_mutation_invalidates_bundle(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            copy_bundle(root)
            before = load_domain_profiles(root)
            self.assertEqual(before, load_domain_profiles(root))
            self.edit(root, PROFILES["MARKET"], lambda obj: obj.update(
                prompt=obj["prompt"] + " harmless extra source-bound advisory sentence"))
            after = load_domain_profiles(root)
            self.assertNotEqual(before["bundle_sha256"], after["bundle_sha256"])
            self.assertNotEqual(before["domains"]["MARKET"]["profile_sha256"],
                                after["domains"]["MARKET"]["profile_sha256"])
            self.assertEqual(before["domains"]["TRUST"]["profile_sha256"],
                             after["domains"]["TRUST"]["profile_sha256"])

    def test_extra_domain_or_repository_escape_is_denied(self):
        for altered in (
            lambda obj: obj["domainPrompts"].update(OTHER="CAPITAL-AI-TRUST/domain.prompt.json"),
            lambda obj: obj["solo2DomainLoop"].update(repository="SvenKulessa/DeviceCare-KI"),
            lambda obj: obj["solo2DomainLoop"].update(projectIsolation="SHARED"),
            lambda obj: obj["solo2DomainLoop"].update(runtimeActivation="VERIFIED"),
            lambda obj: obj["solo2DomainLoop"].update(permissionExpansion=True),
            lambda obj: obj["solo2DomainLoop"]["claims"].update(grantsToolAccess=True),
            lambda obj: obj["solo2DomainLoop"].update(schedulerPolicy="CREATE_NEW"),
            lambda obj: obj["solo2DomainLoop"]["orchestration"].update(writesSerialized=False),
        ):
            with self.subTest(candidate=str(altered)), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                copy_bundle(root)
                self.edit(root, APP, altered)
                with self.assertRaises(ValueError):
                    load_domain_profiles(root)

    def test_domain_skill_spoof_and_profile_authority_are_denied(self):
        for relative, fn in (
            (PROFILES["TRUST"], lambda obj: obj.update(engineeringSkill="spoofed-skill")),
            (PROFILES["MARKET"], lambda obj: obj["authority"].update(permissionExpansion=True)),
            (PROFILES["PLATFORM"], lambda obj: obj["solo2DomainLoop"].update(createsScheduler=True)),
            (PROFILES["GROWTH"], lambda obj: obj["solo2DomainLoop"].update(primaryDomain="TRUST")),
            (REGISTRY, lambda obj: obj["domains"]["PRODUCT"].update(engineering="new-provider-skill")),
        ):
            with self.subTest(relative=relative), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                copy_bundle(root)
                self.edit(root, relative, fn)
                with self.assertRaises(ValueError):
                    load_domain_profiles(root)

    def test_duplicate_property_and_bidi_control_are_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            copy_bundle(root)
            p = root / APP
            original = p.read_text(encoding="utf-8")
            p.write_text(original.replace('"schema":', '"schema":"spoof","schema":', 1),
                         encoding="utf-8")
            with self.assertRaises(ValueError):
                load_domain_profiles(root)
            p.write_text(original.replace('"schema":', '"schema": "\u202e', 1),
                         encoding="utf-8")
            with self.assertRaises(ValueError):
                load_domain_profiles(root)

    def test_missing_symlinked_and_oversized_metadata_fail_closed(self):
        for kind in ("missing", "symlink", "oversized"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                copy_bundle(root)
                p = root / PROFILES["PRODUCT"]
                if kind == "missing":
                    p.unlink()
                elif kind == "symlink":
                    p.unlink()
                    p.symlink_to(root / PROFILES["TRUST"])
                else:
                    p.write_bytes(b"x" * 180001)
                with self.assertRaises((OSError, ValueError)):
                    load_domain_profiles(root)

    def test_root_agents_is_mandatory_but_prompts_are_never_permissions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            copy_bundle(root)
            (root / "AGENTS.md").write_text("Untrusted policy\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                load_domain_profiles(root)


if __name__ == "__main__":
    unittest.main()
