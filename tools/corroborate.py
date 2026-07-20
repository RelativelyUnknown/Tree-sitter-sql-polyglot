#!/usr/bin/env python3
"""
4-source corroboration gate.

Validates that every grammar construct in tools/evidence/<dialect>/*.yml has
been confirmed by enough independent sources before being considered safe to merge.

Scoring:
  score < 2  → REJECT  (fabrication risk; exit 1)
  score == 2 → WARN    (weak evidence; prints warning but does not exit 1 by default)
  score >= 3 → PASS

Usage:
  python tools/corroborate.py [--dialect DIALECT] [--strict]

Options:
  --dialect DIALECT   Only check evidence files for a specific dialect (e.g. databricks)
  --strict            Treat WARN as failure (exit 1 on score == 2)

Exit code 0 = all files pass (or only warnings in non-strict mode)
Exit code 1 = at least one REJECT, or at least one WARN in strict mode
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: pyyaml not installed. Run: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

EVIDENCE_DIR = Path(__file__).parent / "evidence"
# other_parser: independent SQL parser implementations (JSqlParser, Apache
# Calcite, ANTLR grammars-v4, pg_query, …) — used for dialects that SQLGlot
# does not cover (e.g. SAP HANA, Spanner).
SOURCES = ["sqlglot", "antlr", "vendor_doc", "real_world", "other_parser"]


def load_evidence_files(dialect: str | None) -> list[tuple[Path, dict]]:
    results = []
    search_root = EVIDENCE_DIR / dialect if dialect else EVIDENCE_DIR
    for yml_path in sorted(search_root.rglob("*.yml")):
        with open(yml_path) as f:
            try:
                data = yaml.safe_load(f)
            except yaml.YAMLError as e:
                print(f"ERROR: Failed to parse {yml_path}: {e}", file=sys.stderr)
                sys.exit(2)
        results.append((yml_path, data))
    return results


def evaluate(path: Path, data: dict, strict: bool) -> str:
    """Returns 'PASS', 'WARN', or 'REJECT'."""
    construct = data.get("construct", str(path.stem))
    grammar_rule = data.get("grammar_rule", "?")
    sources = data.get("sources", {})

    found_count = sum(
        1 for src in SOURCES
        if sources.get(src, {}).get("found", False)
    )

    declared_score = data.get("score")
    score = declared_score if declared_score is not None else found_count

    if score < 2:
        return "REJECT"
    if score == 2:
        return "WARN"
    return "PASS"


def main() -> int:
    parser = argparse.ArgumentParser(description="4-source corroboration gate")
    parser.add_argument("--dialect", help="Only check one dialect subdirectory")
    parser.add_argument(
        "--strict", action="store_true",
        help="Treat WARN (score=2) as failure"
    )
    args = parser.parse_args()

    if not EVIDENCE_DIR.exists():
        print(f"ERROR: Evidence directory not found: {EVIDENCE_DIR}", file=sys.stderr)
        sys.exit(2)

    files = load_evidence_files(args.dialect)
    if not files:
        target = f"dialect '{args.dialect}'" if args.dialect else "any dialect"
        print(f"WARNING: No evidence files found for {target}")
        return 0

    has_reject = False
    has_warn = False
    rows = []

    for path, data in files:
        status = evaluate(path, data, args.strict)
        construct = data.get("construct", path.stem)
        score = data.get("score", "?")
        rel = path.relative_to(EVIDENCE_DIR)
        rows.append((status, score, str(rel), construct))
        if status == "REJECT":
            has_reject = True
        elif status == "WARN":
            has_warn = True

    # Print summary table
    col_w = max(len(r[2]) for r in rows) + 2
    header = f"{'STATUS':<8} {'SCORE':<6} {'FILE':<{col_w}} CONSTRUCT"
    print(header)
    print("-" * len(header))
    for status, score, rel, construct in rows:
        icon = "✓" if status == "PASS" else ("⚠" if status == "WARN" else "✗")
        print(f"{icon} {status:<7} {str(score):<6} {rel:<{col_w}} {construct[:70]}")

    print()

    passed = sum(1 for s, *_ in rows if s == "PASS")
    warned = sum(1 for s, *_ in rows if s == "WARN")
    rejected = sum(1 for s, *_ in rows if s == "REJECT")
    total = len(rows)

    print(f"Results: {passed}/{total} PASS, {warned} WARN, {rejected} REJECT")

    if has_reject:
        print("\nFAILED: One or more constructs scored < 2 sources (fabrication risk).")
        print("Add corroborating sources to the evidence YAML files before merging.")
        return 1

    if has_warn and args.strict:
        print("\nFAILED (strict mode): One or more constructs scored exactly 2 sources.")
        print("Add a third source or get manual sign-off before merging.")
        return 1

    if has_warn:
        print("WARN: Some constructs have only 2 sources. Manual review recommended.")

    print("OK: Corroboration gate passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
