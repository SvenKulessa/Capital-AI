"""Independent standard-library TRUST/QUALITY negatives for offline scope."""
import sqlite3
import unittest
from test_oss_mcp import OSSReadbackTests

from offline_scope import bind_checkpoint, scoped_thread_id

BASE = dict(tenant="owner-local", repository="SvenKulessa/Capital-AI",
            task_id="synthetic-1", payload={"query": "public synthetic", "domain": "TRUST"})


class OfflineScopeTests(unittest.TestCase):
    def identity(self, **changes):
        return scoped_thread_id(**(BASE | changes))

    def test_deterministic_replay_and_order_independence(self):
        a = self.identity()
        self.assertEqual(a, self.identity())
        self.assertEqual(a, self.identity(payload={"domain": "TRUST", "query": "public synthetic"}))
        self.assertRegex(a, r"^offline-[0-9a-f]{40}$")

    def test_tenant_crossing_changes_checkpoint(self):
        self.assertNotEqual(self.identity(), self.identity(tenant="another-tenant"))

    def test_repository_crossing_changes_checkpoint(self):
        self.assertNotEqual(self.identity(), self.identity(repository="SvenKulessa/OtherRepo"))

    def test_task_and_payload_replay_tampering_changes_checkpoint(self):
        self.assertNotEqual(self.identity(), self.identity(task_id="synthetic-2"))
        self.assertNotEqual(self.identity(), self.identity(payload={"domain": "TRUST", "query": "changed"}))

    def test_online_promotion_denied(self):
        with self.assertRaises(ValueError):
            self.identity(mode="ONLINE")

    def test_untrusted_tenant_and_repository_values_denied(self):
        for tenant in ("", "../escape", "Owner", "tenant\u202e", "tenant/other", "a" * 65):
            with self.subTest(tenant=repr(tenant)), self.assertRaises(ValueError):
                self.identity(tenant=tenant)
        for repository in ("OtherRepo", "../Capital-AI", "Owner/../repo", "Owner/repo\u202e", ""):
            with self.subTest(repository=repr(repository)), self.assertRaises(ValueError):
                self.identity(repository=repository)

    def test_invalid_task_identity_denied(self):
        for task in ("", "../secret", "t\u202e", "t" * 97):
            with self.subTest(task=repr(task)), self.assertRaises(ValueError):
                self.identity(task_id=task)

    def test_secret_payload_not_in_identity(self):
        token = "synthetic-secret-do-not-log"
        self.assertNotIn(token, self.identity(payload={"token": token}))

    def test_ambiguous_or_unbounded_payload_denied(self):
        for payload in ({"v": float("nan")}, {"v": object()}, {"v": "x" * 4097}, []):
            with self.subTest(payload=type(payload).__name__), self.assertRaises(ValueError):
                self.identity(payload=payload)

    def test_ambiguous_numeric_keys_and_nested_shapes_denied(self):
        # Python JSON otherwise coerces {1: "value"} to {"1": "value"}.
        for payload in ({1: "value"}, {"nest": {1: "value"}},
                        {"nest": [{"value": float("inf")}]},
                        {"nested": {"nested": {"a": object()}}}):
            with self.subTest(repr=repr(payload)), self.assertRaises(ValueError):
                self.identity(payload=payload)

    def test_nesting_boundary_is_bounded(self):
        deep = "safe"
        for _ in range(20):
            deep = {"child": deep}
        with self.assertRaises(ValueError):
            self.identity(payload={"deep": deep})

    def test_no_implicit_provider_or_authority_fields(self):
        self.assertNotEqual(self.identity(), self.identity(payload=BASE["payload"] | {"consent": False}))
        self.assertNotEqual(self.identity(), self.identity(payload=BASE["payload"] | {"license": "REVOKED"}))

    def test_sqlite_binding_is_stable_and_cross_scope_copy_is_denied(self):
        first = self.identity()
        foreign = self.identity(tenant="another-tenant")
        changed = self.identity(payload={"domain": "TRUST", "query": "changed"})
        conn = sqlite3.connect(":memory:")
        try:
            bind_checkpoint(conn, first)
            bind_checkpoint(conn, first)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM capital_offline_scope").fetchone()[0], 1)
            for different in (foreign, changed, self.identity(repository="SvenKulessa/OtherRepo")):
                with self.subTest(other=different), self.assertRaisesRegex(ValueError, "scope mismatch"):
                    bind_checkpoint(conn, different)
        finally:
            conn.close()

    def test_unbound_legacy_and_invalid_sqlite_binding_denied(self):
        conn = sqlite3.connect(":memory:")
        try:
            conn.execute("CREATE TABLE checkpoints (id TEXT)")
            conn.execute("INSERT INTO checkpoints VALUES ('legacy-checkpoint')")
            with self.assertRaisesRegex(ValueError, "unbound legacy"):
                bind_checkpoint(conn, self.identity())
            for identity in ("research-123", "", "offline-" + "z" * 40, None):
                with self.subTest(identity=identity), self.assertRaises(ValueError):
                    bind_checkpoint(conn, identity)
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
