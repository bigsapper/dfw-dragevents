#!/usr/bin/env python3

from __future__ import annotations

import argparse
import fnmatch
import re

from aws_common import distribution_id_for_alias, ensure_aws_cli, ensure_aws_credentials, info, run, success, warn


PATTERNS = [
    "node_modules/",
    "*.test.js",
    "coverage/",
    "package.json",
    "package-lock.json",
    "vitest.config.js",
    ".gitignore",
    "README.md",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove unwanted files from the S3 bucket.")
    parser.add_argument("--bucket-name", default="dfw-dragevents.com")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def list_s3_keys(bucket_name: str, prefix: str | None = None) -> list[str]:
    target = f"s3://{bucket_name}/"
    if prefix:
        target = f"s3://{bucket_name}/{prefix}"
    result = run(["aws", "s3", "ls", target, "--recursive"], capture_output=True)
    keys: list[str] = []
    for line in result.stdout.splitlines():
        match = re.match(r"^\S+\s+\S+\s+\d+\s+(.+)$", line.strip())
        if match:
            keys.append(match.group(1))
    return keys


def main() -> int:
    args = parse_args()

    info("=== S3 Cleanup Script ===")
    print(f"Bucket: {args.bucket_name}")
    print()

    ensure_aws_cli()
    ensure_aws_credentials()

    if args.dry_run:
        warn("[DRY RUN MODE - No changes will be made]\n")

    info("Removing unwanted files from S3...")
    all_keys = list_s3_keys(args.bucket_name)

    for pattern in PATTERNS:
        print()
        print(f"Searching for: {pattern}")

        if pattern.endswith("/"):
            prefix = pattern
            matches = [key for key in all_keys if key.startswith(prefix)]
            if args.dry_run:
                warn(f"[DRY RUN] Would delete all files under: {prefix}")
                for key in matches[:5]:
                    print(f"  {key}")
            elif matches:
                warn(f"Deleting {len(matches)} files from {prefix}...")
                run(["aws", "s3", "rm", f"s3://{args.bucket_name}/{prefix}", "--recursive"])
                success(f"[OK] Deleted {prefix}")
            else:
                print(f"[INFO] No files found in {prefix}")
        else:
            matches = [key for key in all_keys if fnmatch.fnmatch(key.split("/")[-1], pattern) or fnmatch.fnmatch(key, pattern)]
            if args.dry_run:
                warn(f"[DRY RUN] Would delete files matching: {pattern}")
                for key in matches[:5]:
                    print(f"  {key}")
            elif matches:
                for key in matches:
                    print(f"Deleting: {key}")
                    run(["aws", "s3", "rm", f"s3://{args.bucket_name}/{key}"])
                success(f"[OK] Deleted files matching {pattern}")
            else:
                print(f"[INFO] No files found matching {pattern}")

    print()
    info("=== Cleanup Complete ===")
    print()

    if not args.dry_run:
        info("Invalidating CloudFront cache...")
        dist_id = distribution_id_for_alias(args.bucket_name)
        if dist_id:
            run(
                [
                    "aws",
                    "cloudfront",
                    "create-invalidation",
                    "--distribution-id",
                    dist_id,
                    "--paths",
                    "/*",
                    "--output",
                    "json",
                ]
            )
            success("[OK] CloudFront cache invalidated")
        else:
            warn("[WARN] Could not find a matching CloudFront distribution")

    print()
    print("Summary:")
    print("- Removed node_modules/")
    print("- Removed test files (*.test.js)")
    print("- Removed coverage/")
    print("- Removed package files")
    print("- Removed config files")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
