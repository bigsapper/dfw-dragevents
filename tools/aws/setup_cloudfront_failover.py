#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import tempfile

from aws_common import (
    POLICY_PATH,
    SITE_DIR,
    distribution_id_for_alias,
    ensure_aws_cli,
    ensure_aws_credentials,
    info,
    run,
    success,
    warn,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Set up the secondary S3 bucket used for CloudFront failover.")
    parser.add_argument("--primary-bucket", default="dfw-dragevents.com")
    parser.add_argument("--primary-region", default="us-east-1")
    parser.add_argument("--secondary-bucket", default="dfw-dragevents-backup")
    parser.add_argument("--secondary-region", default="us-west-2")
    parser.add_argument("--distribution-id", default="")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    info("\n=== CloudFront Origin Failover Setup ===")
    print(f"Primary: {args.primary_bucket} ({args.primary_region})")
    print(f"Secondary: {args.secondary_bucket} ({args.secondary_region})")

    ensure_aws_cli()
    ensure_aws_credentials()

    if args.dry_run:
        warn("\n[DRY RUN MODE - No changes will be made]\n")

    distribution_id = args.distribution_id
    if not distribution_id:
        info("\nDetecting CloudFront distribution...")
        distribution_id = distribution_id_for_alias(args.primary_bucket)
        if distribution_id:
            success(f"Found distribution: {distribution_id}")
        else:
            raise SystemExit(f"[ERROR] No CloudFront distribution found for {args.primary_bucket}")

    info("\n--- Step 1: Create secondary bucket ---")
    if args.dry_run:
        warn(f"[DRY RUN] Would create bucket: {args.secondary_bucket} in {args.secondary_region}")
    else:
        result = run(
            [
                "aws",
                "s3api",
                "create-bucket",
                "--bucket",
                args.secondary_bucket,
                "--region",
                args.secondary_region,
                "--create-bucket-configuration",
                f"LocationConstraint={args.secondary_region}",
            ],
            check=False,
        )
        if result.returncode == 0:
            success("[OK] Secondary bucket created")
        else:
            warn("[INFO] Secondary bucket may already exist")

    info("\n--- Step 2: Enable website hosting on secondary ---")
    if args.dry_run:
        warn(f"[DRY RUN] Would enable website hosting on {args.secondary_bucket}")
    else:
        run(
            [
                "aws",
                "s3",
                "website",
                f"s3://{args.secondary_bucket}/",
                "--index-document",
                "index.html",
                "--error-document",
                "404.html",
                "--region",
                args.secondary_region,
            ]
        )
        success("[OK] Website hosting enabled")

    info("\n--- Step 3: Apply public read policy to secondary ---")
    if not POLICY_PATH.exists():
        raise SystemExit(f"[ERROR] Policy file not found: {POLICY_PATH}")
    if args.dry_run:
        warn("[DRY RUN] Would apply public read policy")
    else:
        policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
        policy["Statement"][0]["Resource"] = f"arn:aws:s3:::{args.secondary_bucket}/*"
        handle = tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False)
        with handle:
            json.dump(policy, handle)
        try:
            run(
                [
                    "aws",
                    "s3api",
                    "put-bucket-policy",
                    "--bucket",
                    args.secondary_bucket,
                    "--policy",
                    f"file://{handle.name}",
                    "--region",
                    args.secondary_region,
                ]
            )
        finally:
            os.unlink(handle.name)
        success("[OK] Public read policy applied")

    info("\n--- Step 4: Sync content to secondary bucket ---")
    if args.dry_run:
        warn(f"[DRY RUN] Would sync: {SITE_DIR} -> s3://{args.secondary_bucket}/")
    else:
        run(["aws", "s3", "sync", str(SITE_DIR), f"s3://{args.secondary_bucket}/", "--delete", "--region", args.secondary_region])
        success("[OK] Content synced to secondary bucket")

    info("\n--- Step 5: Configure CloudFront failover ---")
    if args.dry_run:
        warn("[DRY RUN] Would configure origin failover in CloudFront")
        warn(f"[DRY RUN] Primary: {args.primary_bucket}.s3-website-{args.primary_region}.amazonaws.com")
        warn(f"[DRY RUN] Secondary: {args.secondary_bucket}.s3-website-{args.secondary_region}.amazonaws.com")
    else:
        warn("[INFO] CloudFront failover configuration still requires manual setup via the AWS Console")
        print()
        print("Manual Steps Required:")
        print(f"1. Open CloudFront: https://console.aws.amazon.com/cloudfront/v3/home#/distributions/{distribution_id}")
        print("2. Create the secondary origin")
        print(f"   - Origin domain: {args.secondary_bucket}.s3-website-{args.secondary_region}.amazonaws.com")
        print("   - Protocol: HTTP only")
        print(f"   - Name: S3-{args.secondary_bucket}")
        print("3. Create an origin group with both origins")
        print("4. Update the default cache behavior to use the origin group")
        print("5. Save changes")
        print()
        print("CLI helper:")
        print(f"aws cloudfront get-distribution-config --id {distribution_id} > current-config.json")
        print("# Edit current-config.json to add the origin group")
        print(
            f"aws cloudfront update-distribution --id {distribution_id} --distribution-config file://current-config.json --if-match <ETag>"
        )

    info("\n=== Setup Summary ===")
    print()
    print("Completed:")
    print(f"  [OK] Secondary bucket prepared: {args.secondary_bucket}")
    print("  [OK] Website hosting enabled")
    print("  [OK] Public read policy applied")
    print("  [OK] Content synced")
    print()
    print("Manual step required:")
    print("  [ ] Configure CloudFront origin failover")
    print()
    print("Testing:")
    print(f"  Primary: http://{args.primary_bucket}.s3-website-{args.primary_region}.amazonaws.com")
    print(f"  Secondary: http://{args.secondary_bucket}.s3-website-{args.secondary_region}.amazonaws.com")
    print()
    print("Next steps:")
    print("  1. Test both bucket URLs")
    print("  2. Configure CloudFront origin failover")
    print("  3. Confirm deployments continue syncing both buckets")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
