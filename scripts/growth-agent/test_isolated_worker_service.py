"""No-provider supervisor and restart-boundary tests."""
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

import isolated_worker_service as service


class WorkerServiceTests(unittest.TestCase):
    def test_rejects_ephemeral_root_without_starting_loop(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "worker"
            root.mkdir(mode=0o700)
            for name in ("checkpoints", "approvals"):
                (root / name).mkdir(mode=0o700)
            with self.assertRaises(PermissionError):
                service.serve(root, stop=threading.Event())

    def test_graceful_stop_has_no_actions(self):
        stop = threading.Event()
        stop.set()
        with patch.object(service, "validate_private_root",
                          return_value={"mount": "LOCAL_MOUNT_PRESENT"}):
            result = service.serve(Path("/unused"), stop=stop)
        self.assertEqual(result["status"], "STOPPED")
        self.assertEqual(result["localMount"], "LOCAL_MOUNT_PRESENT")


if __name__ == "__main__":
    unittest.main()
