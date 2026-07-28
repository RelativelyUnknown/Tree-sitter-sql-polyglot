#!/usr/bin/env python3
"""
GLR / parser-size scanner.

Generation-time table blowup (the "exploding GLR" symptom) is what makes large
dialect grammars slow to build and, in CI, OOM-prone. tree-sitter's LR/GLR table
construction is superlinear in the grammar's ambiguity, so a small grammar change
in the wrong place (a rule that derives the same span two ways, an over-broad
`conflicts` entry, an operator added to a giant precedence-shared operator map)
can multiply the parse table.

This tool measures that footprint for base + every dialect and ranks by it, so the
blowup is visible *before* it turns into a CI OOM. The headline metric is
**parser space size** — the byte size of the generated `src/parser.c` — corroborated
by the table `#define`s tree-sitter emits (STATE_COUNT, LARGE_STATE_COUNT, …) and,
when the tool does the generating, generate wall-time and peak RSS.

It also runs a **pattern-matching operator stress probe**: deeply nested chains of
the dialect's pattern operators (LIKE / NOT LIKE / ILIKE / RLIKE / REGEXP / SIMILAR
TO / GLOB / MATCH). LIKE-family ambiguity is the historical cause of table
explosion here (teradata/clickhouse once failed to generate), so a probe that
parses slowly or errors is an early warning that the operator wiring regressed.

Usage:
  python tools/glr_scan.py                 # generate + measure every grammar, write report
  python tools/glr_scan.py --no-generate   # measure already-generated src/ only (fast)
  python tools/glr_scan.py --dialect clickhouse
  python tools/glr_scan.py --json-only      # skip the markdown render

Artifacts:
  tools/glr_report.json   machine-readable, ranked (committed as a baseline to diff against)
  tools/glr_report.md     human-readable ranked scorecard
"""

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_JSON = ROOT / "tools" / "glr_report.json"
REPORT_MD = ROOT / "tools" / "glr_report.md"

CLI = os.environ.get(
    "TREE_SITTER_BIN",
    "npx --yes --package=tree-sitter-cli@v0.26.3 -- tree-sitter",
)

# base + the 22 dialects, in the canonical order used by scripts/generate-all.js.
DIALECTS = [
    "base", "spark", "postgres", "mysql", "databricks", "snowflake", "bigquery",
    "mariadb", "sqlite", "hive", "oracle", "db2", "tsql", "duckdb", "trino",
    "athena", "redshift", "clickhouse", "flink", "cockroachdb", "spanner",
    "teradata", "hana",
]

# Warn thresholds (headline = parser.c bytes). Tuned above the current base
# (~8 MB / ~6.8k states) so only genuine outliers flag. Override via env.
WARN_PARSER_BYTES = int(os.environ.get("GLR_WARN_BYTES", 14_000_000))
WARN_STATE_COUNT = int(os.environ.get("GLR_WARN_STATES", 12_000))
WARN_PEAK_RSS_MB = int(os.environ.get("GLR_WARN_RSS_MB", 6_000))

# Pattern-matching operators to stress per dialect. Base + everything inherits
# LIKE/RLIKE/REGEXP/SIMILAR TO; the rest are dialect extensions. A probe that a
# dialect can't parse is simply skipped (recorded as unsupported), never failed —
# the signal is *parse time / degradation*, not acceptance.
STRESS_OPERATORS = {
    "_all": ["LIKE", "NOT LIKE", "RLIKE", "REGEXP", "SIMILAR TO", "NOT SIMILAR TO"],
    "postgres": ["ILIKE", "NOT ILIKE"],
    "cockroachdb": ["ILIKE", "NOT ILIKE"],
    "snowflake": ["ILIKE"],
    "sqlite": ["GLOB", "NOT GLOB", "MATCH", "NOT MATCH"],
    "duckdb": ["ILIKE", "GLOB"],
}


def grammar_dir(name: str) -> Path:
    return ROOT if name == "base" else ROOT / name


def parser_c(name: str) -> Path:
    return grammar_dir(name) / "src" / "parser.c"


def grammar_json(name: str) -> Path:
    return grammar_dir(name) / "src" / "grammar.json"


# ─────────────────────────────────────────────────────────────────────────────
# Generation with peak-RSS sampling
# ─────────────────────────────────────────────────────────────────────────────

def _tree_sitter_rss_kb() -> int:
    """Summed RSS (kB) of every live tree-sitter process. The rust `tree-sitter`
    binary spawned by the CLI is the table-construction memory hog; npx/node
    wrappers are negligible but harmless to include."""
    try:
        out = subprocess.run(
            ["ps", "-eo", "rss,comm"], capture_output=True, text=True, timeout=10
        ).stdout
    except Exception:
        return 0
    total = 0
    for line in out.splitlines()[1:]:
        parts = line.split(None, 1)
        if len(parts) == 2 and "tree-sitter" in parts[1]:
            try:
                total += int(parts[0])
            except ValueError:
                pass
    return total


def generate(name: str) -> dict:
    """Force-regenerate `name` from its own directory, sampling peak RSS. Returns
    {generate_seconds, peak_rss_mb, ok, error}."""
    d = grammar_dir(name)
    cmd = shlex.split(CLI) + ["generate", "grammar.js"]
    start = time.monotonic()
    peak_kb = 0
    try:
        proc = subprocess.Popen(
            cmd, cwd=d, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
        )
    except FileNotFoundError as e:
        return {"ok": False, "error": f"cannot launch CLI: {e}",
                "generate_seconds": 0.0, "peak_rss_mb": 0}
    while proc.poll() is None:
        peak_kb = max(peak_kb, _tree_sitter_rss_kb())
        time.sleep(0.5)
    out = proc.stdout.read() if proc.stdout else ""
    secs = round(time.monotonic() - start, 1)
    ok = proc.returncode == 0
    return {
        "ok": ok,
        "error": None if ok else (out.strip()[-500:] or f"exit {proc.returncode}"),
        "generate_seconds": secs,
        "peak_rss_mb": round(peak_kb / 1024),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Static metrics from generated artifacts
# ─────────────────────────────────────────────────────────────────────────────

_DEFINE_KEYS = [
    "STATE_COUNT", "LARGE_STATE_COUNT", "SYMBOL_COUNT", "TOKEN_COUNT",
    "PRODUCTION_ID_COUNT", "MAX_ALIAS_SEQUENCE_LENGTH", "FIELD_COUNT",
]


def parser_metrics(name: str) -> dict:
    p = parser_c(name)
    if not p.exists():
        return {"present": False}
    text = p.read_text(errors="replace")
    m = {"present": True, "parser_c_bytes": p.stat().st_size}
    for key in _DEFINE_KEYS:
        mo = re.search(rf"^#define {key} (\d+)", text, re.M)
        m[key.lower()] = int(mo.group(1)) if mo else None
    return m


def conflict_count(name: str) -> int:
    p = grammar_json(name)
    if not p.exists():
        return -1
    try:
        g = json.loads(p.read_text())
    except Exception:
        return -1
    return len(g.get("conflicts", []))


# ─────────────────────────────────────────────────────────────────────────────
# Pattern-operator stress probe
# ─────────────────────────────────────────────────────────────────────────────

def _stress_sql(op: str, depth: int = 40) -> str:
    # Left-nested chain: a LIKE 'x' LIKE 'x' ... — maximises operator fan-out.
    return "SELECT a " + " ".join(f"{op} 'p{i}'" for i in range(depth)) + ";"


def stress_probe(name: str) -> dict:
    """Parse deep pattern-operator chains; record max parse time and any op that
    the parser rejects (unsupported for that dialect, not a failure)."""
    if not parser_c(name).exists():
        return {"ran": False}
    ops = list(STRESS_OPERATORS["_all"]) + STRESS_OPERATORS.get(name, [])
    probe_dir = grammar_dir(name) / "tmp" / "glr-stress"
    probe_dir.mkdir(parents=True, exist_ok=True)
    cfg = probe_dir / "ts-config.json"
    cfg.write_text('{"parser-directories": []}\n')
    worst = 0.0
    unsupported = []
    try:
        for op in ops:
            f = probe_dir / (re.sub(r"\W+", "_", op) + ".sql")
            f.write_text(_stress_sql(op))
            t0 = time.monotonic()
            try:
                r = subprocess.run(
                    shlex.split(CLI) + ["parse", "-q", "--config-path", str(cfg), str(f)],
                    cwd=grammar_dir(name), capture_output=True, text=True, timeout=120,
                )
            except subprocess.TimeoutExpired:
                worst = max(worst, 120.0)
                continue
            worst = max(worst, time.monotonic() - t0)
            if r.returncode not in (0,):
                unsupported.append(op)
    finally:
        import shutil
        shutil.rmtree(probe_dir, ignore_errors=True)
    return {"ran": True, "worst_parse_seconds": round(worst, 2),
            "unsupported_ops": sorted(unsupported)}


# ─────────────────────────────────────────────────────────────────────────────
# Driver
# ─────────────────────────────────────────────────────────────────────────────

def scan(dialects, do_generate, do_stress) -> dict:
    rows = {}
    for name in dialects:
        print(f"[glr] {name} ...", flush=True)
        row = {"dialect": name}
        if do_generate:
            row["generation"] = generate(name)
            if not row["generation"]["ok"]:
                print(f"[glr]   generate FAILED: {row['generation']['error']}")
        row["metrics"] = parser_metrics(name)
        row["conflicts"] = conflict_count(name)
        if do_stress:
            row["stress"] = stress_probe(name)
        m = row["metrics"]
        if m.get("present"):
            flags = []
            if m["parser_c_bytes"] > WARN_PARSER_BYTES:
                flags.append("parser_size")
            if (m.get("state_count") or 0) > WARN_STATE_COUNT:
                flags.append("state_count")
            if do_generate and row["generation"]["peak_rss_mb"] > WARN_PEAK_RSS_MB:
                flags.append("peak_rss")
            row["flags"] = flags
            g = row.get("generation", {})
            extra = f"  gen {g['generate_seconds']}s peak {g['peak_rss_mb']}MB" if g else ""
            print(f"[glr]   {m['parser_c_bytes']/1e6:6.2f}MB  states={m.get('state_count')}"
                  f"  large={m.get('large_state_count')}  conflicts={row['conflicts']}"
                  f"{extra}{'  ⚠ ' + ','.join(flags) if flags else ''}")
        else:
            row["flags"] = ["not_generated"]
            print("[glr]   parser.c absent (run without --no-generate)")
        rows[name] = row
    return {"generated_on": date.today().isoformat(), "cli": CLI, "dialects": rows}


def _rank(results):
    present = [r for r in results["dialects"].values() if r["metrics"].get("present")]
    return sorted(present, key=lambda r: -r["metrics"]["parser_c_bytes"])


def render_markdown(results: dict) -> str:
    ranked = _rank(results)
    lines = [
        "# GLR / parser-size scan",
        "",
        f"_Generated by `tools/glr_scan.py` on {results['generated_on']}. Do not edit by hand._",
        "",
        "Ranked by **parser space size** (`src/parser.c` bytes) — the headline signal for "
        "GLR table blowup. `states`/`large` are tree-sitter's `STATE_COUNT`/`LARGE_STATE_COUNT`; "
        "`conflicts` is the declared-conflict count; `gen`/`peak` are generation wall-time and "
        "peak RSS when this run did the generating. ⚠ marks a dialect over a blowup threshold.",
        "",
        "| Dialect | parser.c | states | large | conflicts | gen (s) | peak RSS | flags |",
        "|---|--:|--:|--:|--:|--:|--:|---|",
    ]
    for r in ranked:
        m = r["metrics"]
        g = r.get("generation", {})
        lines.append(
            f"| {r['dialect']} | {m['parser_c_bytes']/1e6:.2f} MB | {m.get('state_count')} "
            f"| {m.get('large_state_count')} | {r['conflicts']} "
            f"| {g.get('generate_seconds', '—')} | {str(g.get('peak_rss_mb', '—')) + ' MB' if g else '—'} "
            f"| {', '.join(r.get('flags') or []) or '—'} |"
        )
    stressed = [r for r in ranked if r.get("stress", {}).get("ran")]
    if stressed:
        lines += ["", "## Pattern-operator stress (worst nested-chain parse time)", "",
                  "| Dialect | worst parse (s) | rejected operators |", "|---|--:|---|"]
        for r in sorted(stressed, key=lambda r: -r["stress"]["worst_parse_seconds"]):
            s = r["stress"]
            lines.append(f"| {r['dialect']} | {s['worst_parse_seconds']} "
                         f"| {', '.join(s['unsupported_ops']) or '—'} |")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="GLR / parser-size scanner")
    ap.add_argument("--dialect", help="Scan a single grammar (name, or 'base')")
    ap.add_argument("--no-generate", action="store_true",
                    help="Measure already-generated src/ instead of regenerating")
    ap.add_argument("--no-stress", action="store_true", help="Skip the pattern-operator stress probe")
    ap.add_argument("--json-only", action="store_true", help="Do not write the markdown report")
    args = ap.parse_args()

    dialects = [args.dialect] if args.dialect else DIALECTS
    unknown = [d for d in dialects if d not in DIALECTS]
    if unknown:
        print(f"ERROR: unknown dialect(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    results = scan(dialects, do_generate=not args.no_generate, do_stress=not args.no_stress)

    REPORT_JSON.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n")
    if not args.json_only:
        REPORT_MD.write_text(render_markdown(results))
    print(f"\nWrote {REPORT_JSON.relative_to(ROOT)}"
          f"{'' if args.json_only else ' and ' + str(REPORT_MD.relative_to(ROOT))}")

    ranked = _rank(results)
    if ranked:
        print("\nTop by parser size:")
        for r in ranked[:5]:
            m = r["metrics"]
            print(f"  {r['dialect']:<12} {m['parser_c_bytes']/1e6:6.2f}MB  states={m.get('state_count')}"
                  f"  {'⚠ ' + ','.join(r['flags']) if r.get('flags') else ''}")
    flagged = [r["dialect"] for r in results["dialects"].values() if r.get("flags") and "not_generated" not in r["flags"]]
    if flagged:
        print(f"\n⚠ over threshold: {', '.join(flagged)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
