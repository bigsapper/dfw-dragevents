#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime

from aws_common import ensure_aws_cli, ensure_aws_credentials, info, run, run_json, success, warn


S3_WEBSITE_ZONE_IDS = {
    "us-east-1": "Z3AQBSTGFYJSTF",
    "us-west-2": "Z3BJ6K6RIION7M",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Configure Route 53 DNS records for the site.")
    parser.add_argument("--domain-name", default="dfw-dragevents.com")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--include-www", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def write_change_batch(payload: dict[str, object]) -> str:
    handle = tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False)
    with handle:
        json.dump(payload, handle)
    return handle.name


def build_alias_change(name: str, endpoint: str, hosted_zone_id: str, comment: str) -> dict[str, object]:
    return {
        "Comment": comment,
        "Changes": [
            {
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": name,
                    "Type": "A",
                    "AliasTarget": {
                        "HostedZoneId": hosted_zone_id,
                        "DNSName": endpoint,
                        "EvaluateTargetHealth": False,
                    },
                },
            }
        ],
    }


def main() -> int:
    args = parse_args()

    if args.region not in S3_WEBSITE_ZONE_IDS:
        raise SystemExit(f"[ERROR] Automatic Route 53 alias setup is not supported for region {args.region}.")

    info("=== Route 53 DNS Configuration ===")
    print(f"Domain: {args.domain_name}")
    print(f"Region: {args.region}")
    print()

    ensure_aws_cli()
    ensure_aws_credentials()

    if args.dry_run:
        warn("\n[DRY RUN MODE - No changes will be made]\n")

    info("\n--- Step 1: Checking for hosted zone ---")
    hosted_zones = run_json(
        [
            "aws",
            "route53",
            "list-hosted-zones-by-name",
            "--dns-name",
            args.domain_name,
            "--query",
            f"HostedZones[?Name=='{args.domain_name}.']",
            "--output",
            "json",
        ]
    )

    zone_id = None
    if hosted_zones:
        zone_id = hosted_zones[0]["Id"]
        success(f"[OK] Found hosted zone: {zone_id}")
    else:
        warn(f"[WARN] No hosted zone found for {args.domain_name}")
        if args.dry_run:
            print(f"[DRY RUN] Would create hosted zone for {args.domain_name}")
            zone_id = "/hostedzone/DRYRUN123456"
        else:
            caller_ref = f"dfw-dragevents-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            create_result = run_json(
                [
                    "aws",
                    "route53",
                    "create-hosted-zone",
                    "--name",
                    args.domain_name,
                    "--caller-reference",
                    caller_ref,
                    "--output",
                    "json",
                ]
            )
            zone_id = create_result["HostedZone"]["Id"]
            success(f"[OK] Hosted zone created: {zone_id}")
            print("\nNameservers for this hosted zone:")
            for server in create_result["DelegationSet"]["NameServers"]:
                print(f"  - {server}")

    s3_hosted_zone_id = S3_WEBSITE_ZONE_IDS[args.region]
    s3_endpoint = f"s3-website-{args.region}.amazonaws.com"

    info("\n--- Step 2: Creating A record for apex domain ---")
    apex_payload = build_alias_change(
        args.domain_name,
        s3_endpoint,
        s3_hosted_zone_id,
        f"Create A record for {args.domain_name} pointing to S3 website",
    )
    if args.dry_run:
        print(f"[DRY RUN] Would create A record: {args.domain_name} -> {s3_endpoint}")
    else:
        temp_path = write_change_batch(apex_payload)
        try:
            result = run_json(
                [
                    "aws",
                    "route53",
                    "change-resource-record-sets",
                    "--hosted-zone-id",
                    zone_id,
                    "--change-batch",
                    f"file://{temp_path}",
                    "--output",
                    "json",
                ]
            )
        finally:
            os.unlink(temp_path)
        success(f"[OK] A record created for {args.domain_name}")
        print(f"  Change ID: {result['ChangeInfo']['Id']}")

    if args.include_www:
        info("\n--- Step 3: Creating A record for www subdomain ---")
        www_payload = build_alias_change(
            f"www.{args.domain_name}",
            s3_endpoint,
            s3_hosted_zone_id,
            f"Create A record for www.{args.domain_name} pointing to S3 website",
        )
        if args.dry_run:
            print(f"[DRY RUN] Would create A record: www.{args.domain_name} -> {s3_endpoint}")
        else:
            temp_path = write_change_batch(www_payload)
            try:
                result = run_json(
                    [
                        "aws",
                        "route53",
                        "change-resource-record-sets",
                        "--hosted-zone-id",
                        zone_id,
                        "--change-batch",
                        f"file://{temp_path}",
                        "--output",
                        "json",
                    ]
                )
            finally:
                os.unlink(temp_path)
            success(f"[OK] A record created for www.{args.domain_name}")
            print(f"  Change ID: {result['ChangeInfo']['Id']}")
    else:
        warn("\n--- Step 3: Skipping www subdomain (use --include-www to add) ---")

    info("\n--- Step 4: Verifying DNS configuration ---")
    if not args.dry_run:
        records = run_json(
            [
                "aws",
                "route53",
                "list-resource-record-sets",
                "--hosted-zone-id",
                zone_id,
                "--query",
                f"ResourceRecordSets[?Type=='A' && (Name=='{args.domain_name}.' || Name=='www.{args.domain_name}.')]",
                "--output",
                "json",
            ]
        )
        if records:
            success("[OK] DNS records configured:")
            for record in records:
                print(f"  - {record['Name']} -> {record['AliasTarget']['DNSName']}")
        else:
            warn("[WARN] No A records found (may take a moment to appear)")

    info("\n=== DNS Configuration Complete ===")
    print()
    print("Your site should be accessible at:")
    print(f"  http://{args.domain_name}")
    if args.include_www:
        print(f"  http://www.{args.domain_name}")
    print()
    print("DNS propagation typically takes 1-5 minutes with Route 53.")
    print()
    print("Next steps:")
    print(f"  1. Test your site in a browser: http://{args.domain_name}")
    print("  2. Optional: set up CloudFront and HTTPS")
    print("  3. See docs/AWS_DEPLOYMENT.md for CloudFront setup")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
