#!/usr/bin/env python3

from __future__ import annotations

import argparse
import subprocess

from aws_common import POLICY_PATH, ensure_aws_cli, ensure_aws_credentials, distribution_id_for_alias, info, run, success, sync_site, warn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy the static site to S3 and CloudFront.")
    parser.add_argument("--bucket-name", default="dfw-dragevents.com")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--skip-bucket-creation", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    info("=== DFW Drag Events Deployment ===")
    print(f"Bucket: {args.bucket_name}")
    print(f"Region: {args.region}")
    print()

    ensure_aws_cli()
    ensure_aws_credentials()

    if args.dry_run:
        warn("\n[DRY RUN MODE - No changes will be made]\n")

    if args.skip_bucket_creation:
        warn("\n--- Step 1: Skipping bucket creation ---")
    else:
        info("\n--- Step 1: Creating S3 bucket ---")
        if args.dry_run:
            print(f"[DRY RUN] Would create bucket: {args.bucket_name}")
        else:
            try:
                run(["aws", "s3", "mb", f"s3://{args.bucket_name}", "--region", args.region], check=True)
                success(f"[OK] Bucket created: {args.bucket_name}")
            except subprocess.CalledProcessError:
                warn("[WARN] Bucket may already exist - this is OK")

    info("\n--- Step 2: Enabling static website hosting ---")
    if args.dry_run:
        print("[DRY RUN] Would enable website hosting with index.html and 404.html")
    else:
        run(
            [
                "aws",
                "s3",
                "website",
                f"s3://{args.bucket_name}",
                "--index-document",
                "index.html",
                "--error-document",
                "404.html",
            ]
        )
        success("[OK] Static website hosting enabled")

    info("\n--- Step 3: Applying public read policy ---")
    if not POLICY_PATH.exists():
        raise SystemExit(f"[ERROR] Policy file not found: {POLICY_PATH}")
    if args.dry_run:
        print(f"[DRY RUN] Would apply policy from: {POLICY_PATH}")
    else:
        run(
            [
                "aws",
                "s3api",
                "put-bucket-policy",
                "--bucket",
                args.bucket_name,
                "--policy",
                f"file://{POLICY_PATH}",
            ]
        )
        success("[OK] Public read policy applied")

    info("\n--- Step 4: Uploading site files ---")
    if args.dry_run:
        print(f"[DRY RUN] Would sync site -> s3://{args.bucket_name}/")
    sync_site(args.bucket_name, dry_run=args.dry_run)
    if not args.dry_run:
        success("[OK] Site files uploaded")

    info("\n--- Step 5: Syncing to secondary bucket (us-west-2) ---")
    secondary_bucket = "dfw-dragevents-backup"
    secondary_region = "us-west-2"
    if args.dry_run:
        print(f"[DRY RUN] Would sync site -> s3://{secondary_bucket}/")
    else:
        try:
            sync_site(secondary_bucket, region=secondary_region)
            success("[OK] Secondary bucket synced (failover ready)")
        except subprocess.CalledProcessError as exc:
            warn(f"[WARN] Could not sync to secondary bucket: {exc}")

    info("\n--- Step 6: Invalidating CloudFront cache ---")
    if args.dry_run:
        warn("[DRY RUN] Would invalidate CloudFront cache")
    else:
        dist_id = distribution_id_for_alias(args.bucket_name)
        if dist_id:
            print(f"Found CloudFront distribution: {dist_id}")
            try:
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
            except subprocess.CalledProcessError as exc:
                warn(f"[WARN] Could not invalidate CloudFront cache: {exc}")
        else:
            warn("[INFO] No CloudFront distribution found - skipping cache invalidation")

    info("\n=== Deployment Complete ===")
    website_url = f"http://{args.bucket_name}.s3-website-{args.region}.amazonaws.com"
    print(f"Website URL: {website_url}")
    print(f"HTTPS URL: https://{args.bucket_name}")
    print()
    warn("Changes will be live in 1-2 minutes after CloudFront cache invalidation.")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
