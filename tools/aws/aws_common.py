#!/usr/bin/env python3

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
TOOLS_DIR = SCRIPT_DIR.parent
REPO_ROOT = TOOLS_DIR.parent
SITE_DIR = REPO_ROOT / "site"
POLICY_PATH = SCRIPT_DIR / "s3" / "bucket-policy.json"
SYNC_EXCLUDES = [
    "node_modules/*",
    "*.test.js",
    "coverage/*",
    "package*.json",
    "vitest.config.js",
    ".gitignore",
    "README.md",
]


def color(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m"


def info(text: str) -> None:
    print(color(text, "36"))


def success(text: str) -> None:
    print(color(text, "32"))


def warn(text: str) -> None:
    print(color(text, "33"))


def error(text: str) -> None:
    print(color(text, "31"), file=sys.stderr)


def run(
    cmd: list[str],
    *,
    capture_output: bool = False,
    check: bool = True,
    cwd: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        check=check,
        text=True,
        capture_output=capture_output,
    )


def run_json(cmd: list[str], *, cwd: Path | None = None) -> object:
    result = run(cmd, capture_output=True, cwd=cwd)
    return json.loads(result.stdout or "null")


def ensure_aws_cli() -> None:
    if shutil.which("aws") is None:
        error("[ERROR] AWS CLI not found. Install from: https://aws.amazon.com/cli/")
        raise SystemExit(1)
    run(["aws", "--version"], check=True)
    success("[OK] AWS CLI found")


def ensure_aws_credentials() -> None:
    try:
        run(["aws", "sts", "get-caller-identity"], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        error("[ERROR] AWS credentials not configured. Run: aws configure")
        raise SystemExit(1)
    success("[OK] AWS credentials configured")


def distribution_id_for_alias(alias: str) -> str | None:
    try:
        result = run(
            [
                "aws",
                "cloudfront",
                "list-distributions",
                "--query",
                f"DistributionList.Items[?Aliases.Items[?contains(@,'{alias}')]].Id",
                "--output",
                "text",
            ],
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError:
        return None
    value = result.stdout.strip()
    return value if value and value != "None" else None


def sync_site(bucket: str, *, region: str | None = None, dry_run: bool = False) -> None:
    cmd = ["aws", "s3", "sync", str(SITE_DIR), f"s3://{bucket}/", "--delete"]
    if dry_run:
        cmd.append("--dryrun")
    if region:
        cmd.extend(["--region", region])
    for pattern in SYNC_EXCLUDES:
        cmd.extend(["--exclude", pattern])
    run(cmd)

