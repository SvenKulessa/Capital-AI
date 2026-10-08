"""Offline compatibility check; no model or git-hosting request."""
from pr_agent.config_loader import get_settings, _find_repository_root
from pr_agent.git_providers.plain_diff_provider import PlainDiffGitProvider

assert _find_repository_root() is None, 'Reviewer must run outside a repository'
settings = get_settings()
settings.set('plain_diff.content', 'diff --git a/sample.py b/sample.py\n--- a/sample.py\n+++ b/sample.py\n@@ -1 +1 @@\n-before\n+after\n')
provider = PlainDiffGitProvider()
files = provider.get_diff_files()
assert len(files) == 1 and files[0].filename == 'sample.py'
assert provider.get_files() == ['sample.py']
print('PR-Agent plain-diff offline smoke: PASS')
