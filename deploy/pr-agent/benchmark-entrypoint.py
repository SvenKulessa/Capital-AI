"""Explicit single-model, local-output benchmark. Never posts GitHub reviews."""
import argparse
import os
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--diff', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--model', required=True)
args = parser.parse_args()
if any(os.environ.get(key) for key in ('GITHUB_TOKEN', 'GH_TOKEN', 'PR_AGENT_EXTRA_CONFIG_URL', 'PR_AGENT_EXTRA_CONFIG_AUTH_HEADER')):
    parser.error('Hosting tokens and external repository configuration are forbidden in this benchmark')
if not Path(args.diff).is_file() or Path(args.output).exists():
    parser.error('Provide an existing frozen diff and a new output file')

from pr_agent.config_loader import get_settings, _find_repository_root
from pr_agent.cli import run

if _find_repository_root() is not None:
    parser.error('Run in a directory without .git ancestry')
settings = get_settings()
for key, value in {
    'config.model': args.model, 'config.model_weak': args.model,
    'config.fallback_models': [], 'config.temperature': 0,
    'config.restricted_mode': True, 'config.enable_auto_approval': False,
    'config.use_repo_settings_file': False, 'config.use_global_settings_file': False,
    'config.extra_config_url': '', 'config.secret_provider': '',
    'config.propagate_tool_errors': True, 'config.publish_output_progress': False,
    'config.output_run_cost': True, 'config.output_run_details': True,
    'config.log_level': 'WARNING', 'config.verbosity_level': 0,
    'otel.is_enabled': False, 'push_outputs.enable': False,
    'litellm.success_callback': [], 'litellm.failure_callback': [],
    'litellm.turn_off_message_logging': True,
}.items():
    settings.set(key, value)
exit_code = run(inargs=['--diff-file', str(Path(args.diff).resolve()),
                       '--json-output', str(Path(args.output).resolve()), 'review'])
if exit_code or not Path(args.output).is_file():
    raise SystemExit(exit_code or 1)
