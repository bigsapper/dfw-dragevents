#!/usr/bin/env python3

from __future__ import annotations

import argparse
import time

from aws_common import ensure_aws_cli, ensure_aws_credentials, info, run, success, warn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Monitor ACM certificate validation.")
    parser.add_argument(
        "--certificate-arn",
        default="arn:aws:acm:us-east-1:774929270850:certificate/d84961f0-24d7-46a3-b672-1fa83816eada",
    )
    parser.add_argument("--check-interval-seconds", type=int, default=120)
    parser.add_argument("--max-wait-minutes", type=int, default=30)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    info("=== Certificate Validation Monitor ===")
    print(f"Certificate: {args.certificate_arn}")
    print(f"Checking every {args.check_interval_seconds} seconds...")
    print(f"Max wait time: {args.max_wait_minutes} minutes")
    print()

    ensure_aws_cli()
    ensure_aws_credentials()

    deadline = time.time() + (args.max_wait_minutes * 60)
    check_count = 0
    start = time.time()

    while time.time() < deadline:
        check_count += 1
        elapsed_minutes = round((time.time() - start) / 60, 1)
        print(f"[{elapsed_minutes} min] Check #{check_count} - Querying certificate status...")

        result = run(
            [
                "aws",
                "acm",
                "describe-certificate",
                "--certificate-arn",
                args.certificate_arn,
                "--region",
                "us-east-1",
                "--query",
                "Certificate.Status",
                "--output",
                "text",
            ],
            capture_output=True,
            check=False,
        )

        if result.returncode == 0:
            status = result.stdout.strip()
            print(f"  Status: {status}")
            if status == "ISSUED":
                print()
                success("SUCCESS! Certificate is now ISSUED!")
                print()
                print(f"Certificate ARN: {args.certificate_arn}")
                print(f"Total wait time: {elapsed_minutes} minutes")
                print()
                print("Ready to proceed to CloudFront distribution setup.")
                return 0
            if status in {"FAILED", "VALIDATION_TIMED_OUT"}:
                print()
                warn("ERROR: Certificate validation failed!")
                print(f"Status: {status}")
                print("Check the ACM console for details:")
                print("https://console.aws.amazon.com/acm/home?region=us-east-1")
                return 1
        else:
            warn("  Warning: Failed to query certificate status")

        if time.time() + args.check_interval_seconds < deadline:
            print(f"  Waiting {args.check_interval_seconds} seconds before next check...")
            time.sleep(args.check_interval_seconds)

    print()
    warn(f"Max wait time reached ({args.max_wait_minutes} minutes)")
    print("Certificate may still be validating. Check status manually:")
    print(
        f"  aws acm describe-certificate --certificate-arn {args.certificate_arn} --region us-east-1"
    )
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
