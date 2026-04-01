#!/usr/bin/env python3

from __future__ import annotations

import argparse

from aws_common import info, warn


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Print the manual CloudFront setup checklist.")
    parser.add_argument("--domain-name", default="dfw-dragevents.com")
    parser.add_argument("--include-www", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    info("=== CloudFront Setup ===")
    print(f"Domain: {args.domain_name}")
    print()

    if args.dry_run:
        warn("[DRY RUN MODE]")
        print()

    print("This helper outlines the manual CloudFront setup steps:")
    print("1. Check for or request an SSL certificate in ACM")
    print("2. Create the CloudFront distribution")
    print("3. Update Route 53 DNS")
    print()
    print("For full automation details, see docs/AWS_DEPLOYMENT.md")
    print()
    print("Manual steps required:")
    print("1. Request a certificate in ACM (us-east-1)")
    print("2. Validate the certificate with Route 53")
    print("3. Create the CloudFront distribution in the AWS Console")
    print("4. Update the Route 53 A records to point to CloudFront")
    if args.include_www:
        print("5. Confirm both apex and www aliases are included")
    print()
    print("See docs/AWS_CONSOLE_GUIDE.md for the step-by-step walkthrough.")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
