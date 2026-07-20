#!/usr/bin/env python3
"""
Per-dialect feature-completeness scorecard.

Reads the canonical feature registry (tools/features.yml), parses every
feature's probe SQL with each dialect's compiled tree-sitter parser, and
reports weighted coverage per dialect.

For every (dialect, feature) pair:
  not-applicable  declared in the registry → excluded from the denominator
  implemented     probe parses without ERROR/MISSING nodes
  absent          probe fails to parse → tracked feature gap

Score = Σ weight(implemented) / Σ weight(applicable).

ANSI purity check (base grammar must stay strict ANSI):
  ansi: true   → the BASE parser must accept the default probe
  ansi: false  → the BASE parser must reject it, unless the feature is marked
                 purity_exception: true (inherited from the permissive
                 upstream fork; tracked for cleanup, does not fail the run)

Usage:
  python tools/scorecard.py                  # score + write artifacts
  python tools/scorecard.py --check          # CI gate: fail on regression vs
                                             # committed tools/coverage.json
  python tools/scorecard.py --dialect duckdb # single dialect
  python tools/scorecard.py --skip-missing   # ignore dialects without parsers

Artifacts:
  tools/coverage.json   machine-readable results (committed baseline)
  docs/coverage.md      human-readable scorecard + genealogy tree (VitePress
                        page; generated fresh on every run, never committed)

When run inside GitHub Actions ($GITHUB_STEP_SUMMARY set), the scores table
is also appended to the job summary — every CI run surfaces the scorecard
result directly in the Actions UI, in both --check and full-run modes.

Requires generated parsers (npm run generate:all) and the pinned
tree-sitter CLI (override the binary with TREE_SITTER_BIN).
"""

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: pyyaml not installed. Run: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
FEATURES_FILE = ROOT / "tools" / "features.yml"
COVERAGE_JSON = ROOT / "tools" / "coverage.json"
COVERAGE_MD = ROOT / "docs" / "coverage.md"

VITEPRESS_FRONTMATTER = """---
title: Dialect coverage
outline: [2, 3]
editLink: false
---

"""

TS_BIN = os.environ.get(
    "TREE_SITTER_BIN",
    "npx --yes --package=tree-sitter-cli@v0.26.3 -- tree-sitter",
)


def load_registry() -> dict:
    with open(FEATURES_FILE) as f:
        return yaml.safe_load(f)


def dialect_dir(name: str) -> Path:
    return ROOT if name == "base" else ROOT / name


def has_parser(name: str) -> bool:
    src = dialect_dir(name) / "src"
    parser = src / "parser.c"
    grammar = src / "grammar.json"
    if not parser.exists():
        return False
    # A grammar.json newer than parser.c means a generation run failed partway
    # (grammar.json is written before table construction) — treat as missing so
    # stale parsers can never silently skew scores.
    if grammar.exists() and grammar.stat().st_mtime > parser.stat().st_mtime:
        print(f"WARNING: {name}: parser.c is older than grammar.json (partial "
              f"generation?) — run: node scripts/generate.js {name}", file=sys.stderr)
        return False
    return True


def probe_for(feature: dict, dialect: str) -> tuple[str | None, str | None]:
    """Returns (probe_sql, not_applicable_reason). Exactly one is non-None."""
    override = (feature.get("dialects") or {}).get(dialect) or {}
    if override.get("status") == "not-applicable":
        return None, override.get("reason", "not applicable")
    return override.get("probe", feature["probe"]), None


def parse_probes(dialect: str, probes: dict[str, str]) -> dict[str, bool]:
    """Parse each probe with the dialect's parser. Returns {feature_id: ok}.

    Uses a single `tree-sitter parse -q` invocation over one file per probe;
    -q prints (only) a stats line for files that contain errors.

    Grammar selection is the subtle part. Probe files are written INSIDE the
    dialect's directory (tmp/, gitignored) so that, walking up from each file,
    the CLI finds the dialect's own tree-sitter.json. But that only works when
    nothing else claims the file first: tree-sitter/setup-action writes a
    global ~/.config/tree-sitter/config.json with `parser-directories` pointing
    at the CI workspace, and when that config is present the CLI resolves every
    `.sql` file through it — matching the base `sql` grammar for ALL dialects
    and reporting their extensions (COMMENT ON, SHOW, …) as absent. We override
    it with `--config-path` pointing at a config whose `parser-directories` is
    empty, which forces the CLI back to file-relative resolution (the dialect
    grammar) regardless of any global config. Locally, where no global config
    exists, this changes nothing.
    """
    results: dict[str, bool] = {}
    if not probes:
        return results
    probe_dir = dialect_dir(dialect) / "tmp" / "scorecard-probes"
    probe_dir.mkdir(parents=True, exist_ok=True)
    try:
        files = {}
        for fid, sql in probes.items():
            p = probe_dir / f"{fid}.sql"
            p.write_text(sql + "\n")
            files[str(p)] = fid

        config_path = probe_dir / "ts-config.json"
        config_path.write_text('{"parser-directories": []}\n')

        cmd = shlex.split(TS_BIN) + [
            "parse", "-q", "--config-path", str(config_path), *files.keys()
        ]
        proc = subprocess.run(
            cmd,
            cwd=dialect_dir(dialect),
            capture_output=True,
            text=True,
            timeout=600,
        )
        failed_output = proc.stdout + proc.stderr
        for path, fid in files.items():
            # -q lists (only) files with parse errors; match on the full path
            # (never the bare file name: "cte.sql" is a substring of
            # "recursive_cte.sql"). Newer CLIs print the path relative to CWD,
            # so check both spellings.
            rel = str(Path(path).relative_to(dialect_dir(dialect)))
            results[fid] = path not in failed_output and rel not in failed_output
        # Sanity: if the CLI itself broke (e.g. no parser), everything fails.
        if proc.returncode not in (0, 1):
            for fid in files.values():
                results[fid] = False
    finally:
        shutil.rmtree(probe_dir, ignore_errors=True)
    return results


def evaluate(reg: dict, only_dialect: str | None, skip_missing: bool) -> dict:
    dialects = list(reg["dialects"].keys())
    if only_dialect:
        if only_dialect not in dialects:
            print(f"ERROR: unknown dialect '{only_dialect}'", file=sys.stderr)
            sys.exit(2)
        dialects = ["base", only_dialect] if only_dialect != "base" else ["base"]

    missing = [d for d in dialects if not has_parser(d)]
    if missing:
        msg = f"Parsers not generated for: {', '.join(missing)} (run npm run generate:all)"
        if skip_missing:
            print(f"WARNING: {msg} — skipping")
            dialects = [d for d in dialects if d not in missing]
        else:
            print(f"ERROR: {msg}", file=sys.stderr)
            sys.exit(2)

    features = reg["features"]
    out: dict = {"dialects": {}, "purity": {"violations": [], "exceptions": []}}

    for d in dialects:
        probes, reasons = {}, {}
        for feat in features:
            if d == "base":
                continue  # base is scored by the purity check instead
            sql, na_reason = probe_for(feat, d)
            if na_reason is not None:
                reasons[feat["id"]] = na_reason
            else:
                probes[feat["id"]] = sql

        parsed = parse_probes(d, probes) if d != "base" else {}

        feats, got, total = {}, 0, 0
        for feat in features:
            fid, w = feat["id"], feat["weight"]
            if d == "base":
                continue
            if fid in reasons:
                feats[fid] = {"status": "not-applicable", "reason": reasons[fid]}
            elif parsed.get(fid):
                feats[fid] = {"status": "implemented"}
                got += w
                total += w
            else:
                feats[fid] = {"status": "absent"}
                total += w
        if d != "base":
            out["dialects"][d] = {
                "score": round(100.0 * got / total, 1) if total else 0.0,
                "weight_implemented": got,
                "weight_applicable": total,
                "features": feats,
            }

    # ANSI purity: default probes against the base parser.
    if "base" in dialects and has_parser("base"):
        base_probes = {f["id"]: f["probe"] for f in features}
        base_ok = parse_probes("base", base_probes)
        for feat in features:
            fid = feat["id"]
            if feat["ansi"] and not base_ok.get(fid):
                out["purity"]["violations"].append(
                    {"feature": fid, "kind": "ansi-feature-rejected-by-base"}
                )
            if not feat["ansi"] and base_ok.get(fid):
                entry = {"feature": fid, "kind": "extension-accepted-by-base"}
                if feat.get("purity_exception"):
                    out["purity"]["exceptions"].append(entry)
                else:
                    out["purity"]["violations"].append(entry)

    return out


def render_markdown(reg: dict, results: dict) -> str:
    features = reg["features"]
    dialect_meta = reg["dialects"]
    dialects = [d for d in results["dialects"]]

    lines = [
        "# Dialect feature coverage",
        "",
        f"_Generated by `tools/scorecard.py` on {date.today().isoformat()}. Do not edit by hand._",
        "",
        "Status legend: ✅ implemented · ❌ absent (tracked gap) · — not applicable upstream",
        "",
        "## Scores",
        "",
        "| Dialect | Parent | Family | Score | Implemented / Applicable (weighted) |",
        "|---|---|---|---|---|",
    ]
    for d in sorted(dialects, key=lambda x: -results["dialects"][x]["score"]):
        m = dialect_meta.get(d, {})
        r = results["dialects"][d]
        lines.append(
            f"| **{d}** | {m.get('parent') or '—'} | {m.get('family', '')} "
            f"| **{r['score']}%** | {r['weight_implemented']} / {r['weight_applicable']} |"
        )

    lines += [
        "",
        "## Genealogy",
        "",
        "```",
    ]
    children: dict[str, list] = {}
    for d, m in dialect_meta.items():
        children.setdefault(m.get("parent") or "root", []).append(d)

    def tree(node: str, prefix: str = "") -> None:
        kids = sorted(children.get(node, []))
        for i, kid in enumerate(kids):
            last = i == len(kids) - 1
            lines.append(f"{prefix}{'└── ' if last else '├── '}{kid}")
            tree(kid, prefix + ("    " if last else "│   "))

    lines.append("base (ANSI)")
    tree("base")
    lines.append("```")

    lines += ["", "## Feature matrix", ""]
    header = "| Feature (weight) | " + " | ".join(dialects) + " |"
    lines.append(header)
    lines.append("|---" * (len(dialects) + 1) + "|")
    icon = {"implemented": "✅", "absent": "❌", "not-applicable": "—"}
    for feat in features:
        fid = feat["id"]
        row = [f"`{fid}` ({feat['weight']})"]
        for d in dialects:
            st = results["dialects"][d]["features"][fid]["status"]
            row.append(icon[st])
        lines.append("| " + " | ".join(row) + " |")

    pur = results["purity"]
    lines += ["", "## ANSI purity (base grammar)", ""]
    if pur["violations"]:
        lines.append("**Violations (must be fixed):**")
        for v in pur["violations"]:
            lines.append(f"- `{v['feature']}` — {v['kind']}")
    else:
        lines.append("No purity violations. 🎉")
    if pur["exceptions"]:
        lines += [
            "",
            "**Grandfathered exceptions** (inherited from the permissive upstream "
            "fork; each needs a cleanup issue):",
        ]
        for v in pur["exceptions"]:
            lines.append(f"- `{v['feature']}`")
    lines.append("")
    return "\n".join(lines)


def render_step_summary(results: dict) -> str:
    """Compact scores table for the GitHub Actions job summary."""
    lines = [
        "## SQL dialect feature coverage",
        "",
        "| Dialect | Score | Implemented / Applicable |",
        "|---|---|---|",
    ]
    for d, r in sorted(results["dialects"].items(), key=lambda kv: -kv[1]["score"]):
        lines.append(f"| {d} | {r['score']}% | {r['weight_implemented']} / {r['weight_applicable']} |")

    pur = results["purity"]
    if pur["violations"]:
        lines += ["", f"**{len(pur['violations'])} ANSI purity violation(s):**"]
        lines += [f"- `{v['feature']}` — {v['kind']}" for v in pur["violations"]]
    else:
        lines += ["", "ANSI purity: clean (no violations)."]
    lines.append("")
    return "\n".join(lines)


def write_step_summary(results: dict) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a") as f:
        f.write(render_step_summary(results))


def main() -> int:
    ap = argparse.ArgumentParser(description="Dialect feature scorecard")
    ap.add_argument("--check", action="store_true",
                    help="CI gate: compare against committed coverage.json")
    ap.add_argument("--dialect", help="Score a single dialect")
    ap.add_argument("--skip-missing", action="store_true",
                    help="Skip dialects whose parser is not generated")
    args = ap.parse_args()

    reg = load_registry()
    results = evaluate(reg, args.dialect, args.skip_missing)

    for d, r in sorted(results["dialects"].items(), key=lambda kv: -kv[1]["score"]):
        gaps = [f for f, v in r["features"].items() if v["status"] == "absent"]
        gap_note = f"  gaps: {', '.join(gaps)}" if gaps else ""
        print(f"[scorecard] {d:<12} {r['score']:>5}%  "
              f"({r['weight_implemented']}/{r['weight_applicable']}){gap_note}")

    violations = results["purity"]["violations"]
    if violations:
        print("\n[purity] ANSI purity violations:")
        for v in violations:
            print(f"  ✗ {v['feature']}: {v['kind']}")

    # Surface the result in the Actions job summary regardless of mode — this
    # is the always-on "CI outputs the scorecard" behavior, not just --check.
    write_step_summary(results)

    if args.check:
        if not COVERAGE_JSON.exists():
            print("ERROR: tools/coverage.json missing — run scorecard.py to create it.",
                  file=sys.stderr)
            return 1
        baseline = json.loads(COVERAGE_JSON.read_text())
        regressions = []
        for d, r in results["dialects"].items():
            base_d = baseline.get("dialects", {}).get(d)
            if not base_d:
                continue  # new dialect — no baseline yet
            for fid, v in r["features"].items():
                was = base_d.get("features", {}).get(fid, {}).get("status")
                if was == "implemented" and v["status"] == "absent":
                    regressions.append(f"{d}/{fid}: implemented → absent")
        if regressions:
            print("\nFAILED: coverage regressions detected:")
            for r in regressions:
                print(f"  ✗ {r}")
            return 1
        if violations:
            print("\nFAILED: new ANSI purity violations.")
            return 1
        print("\nOK: no regressions, purity intact.")
        return 0

    # Write artifacts (full runs only, so partial runs don't clobber them).
    # docs/coverage.md is a generated VitePress page — never committed (see
    # .gitignore) — so it is safe to regenerate (and its date stamp to churn)
    # on every build; tools/coverage.json remains the committed --check
    # baseline and is the only artifact meant to be reviewed in a diff.
    if not args.dialect:
        COVERAGE_JSON.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n")
        COVERAGE_MD.parent.mkdir(parents=True, exist_ok=True)
        COVERAGE_MD.write_text(VITEPRESS_FRONTMATTER + render_markdown(reg, results))
        print(f"\nWrote {COVERAGE_JSON.relative_to(ROOT)} and {COVERAGE_MD.relative_to(ROOT)}")

    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
