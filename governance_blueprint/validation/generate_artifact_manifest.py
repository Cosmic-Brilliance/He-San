#!/usr/bin/env python3
"""
Generate or check the artifact manifest for governance assets.
"""

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


def get_file_hash(filepath: Path) -> str:
    """Calculate SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            data = f.read(65536)
            if not data:
                break
            sha256.update(data)
    return sha256.hexdigest()


def build_manifest(preserve_timestamp: bool = False) -> Dict[str, Any]:
    """Build the manifest of artifacts."""
    base_dir = Path(__file__).parent.parent
    artifacts = {}

    # Core artifacts
    patterns = [
        "*.csv",
        "*.json",
        "*.yaml",
        "opa/*.rego",
        "validation/*.py",
    ]
    for pattern in patterns:
        for path in base_dir.glob(pattern):
            if path.name == "artifact_manifest.json":
                continue
            rel_path = path.relative_to(base_dir)
            artifacts[str(rel_path)] = get_file_hash(path)

    # External artifacts (placeholders or remote refs)
    ext_id = "REGULATOR_READY_AGI_ASI_TECHNICAL_REPORT_2026_2030.md"
    ext_hash = (
        "b590161a765704a9d320dcfa1fae2f8285bc816fc56cf25062e11c3f27bcdbee"
    )
    external_artifacts = {ext_id: ext_hash}

    now = datetime.now(timezone.utc).replace(microsecond=0)
    generated_utc = now.isoformat().replace("+00:00", "Z")

    if preserve_timestamp and os.path.exists(
        base_dir / "artifact_manifest.json"
    ):
        try:
            with open(base_dir / "artifact_manifest.json", "r") as f:
                old = json.load(f)
                generated_utc = old.get("generated_utc", generated_utc)
        except Exception:
            pass

    return {
        "package": "enterprise_agi_asi_governance_blueprint",
        "version": "1.4.5",
        "generated_utc": generated_utc,
        "artifacts": artifacts,
        "external_artifacts": external_artifacts,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check", action="store_true", help="Fail if manifest is out of date."
    )
    parser.add_argument(
        "--stamp-now",
        action="store_true",
        help="When generating, refresh generated_utc to current UTC time.",
    )
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent
    manifest_path = base_dir / "artifact_manifest.json"

    if args.check:
        if not manifest_path.exists():
            print("artifact_manifest.json missing")
            return 1
        with open(manifest_path, "r") as f:
            current_obj = json.load(f)

        expected_obj = build_manifest(preserve_timestamp=True)

        if current_obj.get("package") != expected_obj.get("package"):
            print("artifact_manifest.json has mismatched package metadata")
            return 1
        if current_obj.get("version") != expected_obj.get("version"):
            print("artifact_manifest.json has mismatched version metadata")
            return 1

        if current_obj.get("artifacts") != expected_obj.get("artifacts"):
            print("artifact_manifest.json is out of date; run script")
            return 1
        print("artifact_manifest.json is up to date")
        return 0

    manifest = build_manifest(preserve_timestamp=not args.stamp_now)
    rendered = json.dumps(manifest, indent=2) + "\n"
    with open(manifest_path, "w") as f:
        f.write(rendered)
    print(f"Wrote {manifest_path}")
    return 0


if __name__ == "__main__":
    exit(main())
