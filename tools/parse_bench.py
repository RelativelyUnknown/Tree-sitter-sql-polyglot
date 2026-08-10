#!/usr/bin/env python3
"""
Parse-throughput benchmark (the runtime counterpart to tools/glr_scan.py).

glr_scan.py measures what a grammar costs to *build*: parser.c bytes, STATE_COUNT,
generation wall-time and peak RSS. None of that is what an editor feels. This tool
measures what a grammar costs to *run* (bytes/ms of actual parsing), so a grammar
change can be justified with a number instead of an argument about what ought to be
faster.

Two workloads per dialect:

  real     that dialect's own corpus tests plus its coverage probes, concatenated and
           repeated to a fixed size so every dialect parses the same byte count. This
           is the throughput number that matters.

  stress   inputs built to provoke GLR stack splitting; deep parenthesis nesting,
           huge IN lists, long UNION/CTE chains, wide projections, deep CASE nesting,
           nested pattern operators. Each is measured at two sizes; a dialect whose
           time grows faster than its input has an ambiguity that only shows up on
           real-world SQL, which is exactly the class of bug a corpus test misses.

It also verifies keyword extraction. `word: $ => $._identifier` is declared once, in
the base grammar; every dialect inherits it through grammar(base, overrides). If a
dialect ever loses it, tree-sitter stops emitting ts_lex_keywords and that dialect's
lexer falls back to trying 500+ keyword regexes per token. That is invisible in the
corpus tests and catastrophic for throughput, so it is asserted here.

Timing comes from `tree-sitter parse --json-summary`, which reports per-file parse
duration in nanoseconds excluding process startup and parser compilation. Each file is
parsed REPEATS times and the *minimum* is kept: the fastest observed run is the one
least polluted by scheduler noise.

Usage:
  python tools/parse_bench.py                  # bench every grammar, write artifacts
  python tools/parse_bench.py --dialect duckdb
  python tools/parse_bench.py --check          # CI gate: fail on throughput regression
  python tools/parse_bench.py --no-stress      # real-workload numbers only
  python tools/parse_bench.py --repeats 9      # more samples per file

Artifacts:
  tools/parse_bench.json   machine-readable, committed as the baseline for --check
  tools/parse_bench.md     human-readable report (gitignored)
"""

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_JSON = ROOT / "tools" / "parse_bench.json"
REPORT_MD = ROOT / "tools" / "parse_bench.md"
PROBES_FILE = ROOT / "tools" / "coverage-probes.yml"

CLI = os.environ.get(
    "TREE_SITTER_BIN",
    "npx --yes --package=tree-sitter-cli@v0.26.3 -- tree-sitter",
)

# Same list, same order as tools/glr_scan.py and scripts/generate-all.js.
DIALECTS = [
    "base", "spark", "postgres", "mysql", "databricks", "snowflake", "bigquery",
    "mariadb", "sqlite", "hive", "oracle", "db2", "tsql", "duckdb", "trino",
    "athena", "redshift", "clickhouse", "flink", "cockroachdb", "spanner",
    "teradata", "hana",
]

# Size of the assembled real-workload input. Big enough that per-parse fixed costs
# are noise, small enough that 23 dialects x REPEATS stays a few minutes.
TARGET_BYTES = 1 << 20  # 1 MiB
REPEATS = 5

# A --check run fails if throughput drops by more than this fraction. Parse timing on
# a shared runner is noisy; 15% is well outside run-to-run variance but still catches
# the kind of regression a new GLR conflict causes.
REGRESSION_TOLERANCE = 0.15

# Appended after each candidate statement when filtering, to prove it composes with a
# following statement (see clean_statements). Valid in every dialect here.
SENTINEL = "SELECT 1;"

# Corpus files whose cases are *meant* not to parse; never feed them to a benchmark.
EXCLUDED_CORPUS = {"errors.txt"}

# Corpus test block: "="x80 / name / "="x80 / SQL / "-"x80 / expected tree.
# Documented in AGENTS.md, "Corpus test format".
CORPUS_BLOCK = re.compile(r"^={80}\n(?P<name>.*?)\n={80}\n(?P<sql>.*?)\n-{80}$", re.M | re.S)


def grammar_dir(name: str) -> Path:
    return ROOT if name == "base" else ROOT / name


def parser_c(name: str) -> Path:
    return grammar_dir(name) / "src" / "parser.c"


# ─────────────────────────────────────────────────────────────────────────────
# Workload assembly
# ─────────────────────────────────────────────────────────────────────────────

def corpus_statements(name: str) -> list:
    """Every SQL body in this dialect's corpus tests, as terminated statements."""
    out = []
    d = grammar_dir(name) / "test" / "corpus"
    if not d.is_dir():
        return out
    for f in sorted(d.glob("*.txt")):
        if f.name in EXCLUDED_CORPUS:
            continue
        for m in CORPUS_BLOCK.finditer(f.read_text(errors="replace")):
            sql = m.group("sql").strip()
            # A corpus case may omit the trailing ';' (the program rule allows one
            # unterminated final statement). Concatenating those would fuse two
            # statements into one, so terminate every block.
            if sql and not sql.endswith(";"):
                sql += ";"
            if sql:
                out.append(sql)
    return out


def probe_statements(name: str) -> list:
    """This dialect's coverage probes; the doc-derived feature surface."""
    try:
        import yaml
    except ImportError:
        return []
    if not PROBES_FILE.exists():
        return []
    reg = yaml.safe_load(PROBES_FILE.read_text())
    out = []
    for feat in reg.get("features", []):
        if feat.get("observable", True) is False:
            continue
        override = (feat.get("dialects") or {}).get(name) or {}
        if override.get("status") == "not-applicable":
            continue
        sql = (override.get("probe") or feat.get("probe") or "").strip()
        if sql:
            out.append(sql if sql.endswith(";") else sql + ";")
    return out


def _run_parse(name: str, files: list, cfg: Path) -> dict:
    """Parse `files` with this dialect's parser. Returns the --json-summary dict.

    cwd is the dialect directory and parser-directories is emptied, so grammar
    resolution is forced file-relative; the same guard coverage.py::ours_parses uses
    to stop a global ~/.config/tree-sitter config silently rerouting every .sql to the
    base grammar.
    """
    cmd = shlex.split(CLI) + [
        "parse", "-q", "--json-summary", "--config-path", str(cfg), *[str(f) for f in files]
    ]
    proc = subprocess.run(
        cmd, cwd=grammar_dir(name), capture_output=True, text=True, timeout=900,
    )
    start = proc.stdout.find("{")
    if start < 0:
        return {}
    try:
        return json.loads(proc.stdout[start:])
    except json.JSONDecodeError:
        return {}


def clean_statements(name: str, stmts: list, work: Path, cfg: Path) -> list:
    """Keep only statements this dialect actually parses.

    A corpus case can be dialect-specific in ways the benchmark shouldn't care about,
    and a probe may be a known gap. Feeding an ERROR node into a throughput benchmark
    measures error recovery, not parsing; so anything that fails is dropped, in one
    batched tree-sitter invocation.

    Each candidate is tested *followed by a sentinel statement* rather than alone. The
    `program` rule accepts one unterminated trailing statement, so a statement that
    swallows its own terminator still parses in isolation but breaks the next one;
    which would silently poison the concatenated workload with error recovery. Requiring
    each statement to compose with a successor is what makes the assembled input clean.
    """
    if not stmts:
        return []
    files = []
    for i, sql in enumerate(stmts):
        p = work / f"s{i:05d}.sql"
        p.write_text(sql + "\n" + SENTINEL + "\n")
        files.append(p)
    summary = _run_parse(name, files, cfg)
    ok_paths = {
        s["file"] for s in summary.get("parse_summaries", []) if s.get("successful")
    }
    kept = [
        stmts[i] for i, p in enumerate(files)
        if str(p) in ok_paths or str(p.resolve()) in ok_paths
    ]
    for p in files:
        p.unlink(missing_ok=True)
    return kept


def build_real_input(stmts: list) -> str:
    """Repeat the clean statements to TARGET_BYTES so dialects are comparable."""
    if not stmts:
        return ""
    unit = "\n".join(stmts) + "\n"
    reps = max(1, TARGET_BYTES // len(unit.encode()))
    return unit * reps


# ─────────────────────────────────────────────────────────────────────────────
# Pathological inputs
#
# Each entry is (id, builder). The builder takes a scale factor; every input is
# measured at scale s and 2*s so the report can show how time grows with size. A
# ratio near 2 is linear (healthy); a ratio near 4 means the parser is doing
# quadratic work on that shape.
# ─────────────────────────────────────────────────────────────────────────────

def _deep_parens(n: int) -> str:
    return "SELECT " + "(" * n + "1" + ")" * n + ";"


def _long_in_list(n: int) -> str:
    return "SELECT a FROM t WHERE a IN (" + ", ".join(str(i) for i in range(n)) + ");"


def _union_chain(n: int) -> str:
    return " UNION ALL ".join(f"SELECT {i} AS c FROM t{i}" for i in range(n)) + ";"


def _cte_chain(n: int) -> str:
    ctes = ", ".join(f"c{i} AS (SELECT a FROM t{i})" for i in range(n))
    return f"WITH {ctes} SELECT a FROM c0;"


def _wide_projection(n: int) -> str:
    return "SELECT " + ", ".join(f"c{i} AS a{i}" for i in range(n)) + " FROM t;"


def _nested_case(n: int) -> str:
    body = "1"
    for i in range(n):
        body = f"CASE WHEN a = {i} THEN {body} ELSE {i} END"
    return f"SELECT {body} FROM t;"


def _boolean_chain(n: int) -> str:
    return "SELECT a FROM t WHERE " + " AND ".join(
        f"(c{i} = {i} OR c{i} <> {i})" for i in range(n)
    ) + ";"


def _like_chain(n: int) -> str:
    # The LIKE family is this repo's historical table-explosion trigger; see the
    # note at the top of tools/glr_scan.py.
    return "SELECT a FROM t WHERE " + " AND ".join(
        f"c{i} LIKE 'p%' ESCAPE '\\'" for i in range(n)
    ) + ";"


def _arith_chain(n: int) -> str:
    return "SELECT " + " + ".join(f"c{i} * {i}" for i in range(n)) + " FROM t;"


STRESS = [
    ("deep_parens", _deep_parens, 200),
    ("long_in_list", _long_in_list, 2000),
    ("union_chain", _union_chain, 200),
    ("cte_chain", _cte_chain, 200),
    ("wide_projection", _wide_projection, 1000),
    ("nested_case", _nested_case, 100),
    ("boolean_chain", _boolean_chain, 500),
    ("like_chain", _like_chain, 300),
    ("arith_chain", _arith_chain, 500),
]


# ─────────────────────────────────────────────────────────────────────────────
# Measurement
# ─────────────────────────────────────────────────────────────────────────────

def _nanos(d: dict) -> int:
    return d.get("secs", 0) * 1_000_000_000 + d.get("nanos", 0)


def time_files(name: str, files: list, cfg: Path, repeats: int) -> dict:
    """Parse `files` `repeats` times; return {path: {bytes, ns, bytes_per_ms}} using
    the minimum duration seen per file."""
    best: dict = {}
    for _ in range(repeats):
        summary = _run_parse(name, files, cfg)
        for s in summary.get("parse_summaries", []):
            ns = _nanos(s.get("duration", {}))
            f = s["file"]
            if f not in best or ns < best[f]["ns"]:
                best[f] = {
                    "ns": ns,
                    "bytes": s.get("bytes", 0),
                    "successful": bool(s.get("successful")),
                }
    for v in best.values():
        v["bytes_per_ms"] = round(v["bytes"] / (v["ns"] / 1e6), 1) if v["ns"] else None
    return best


def has_keyword_extraction(name: str) -> bool:
    """tree-sitter emits ts_lex_keywords only when the grammar declares `word:`."""
    p = parser_c(name)
    if not p.exists():
        return False
    with p.open(errors="replace") as f:
        for line in f:
            if "ts_lex_keywords" in line:
                return True
    return False


def bench_dialect(name: str, do_stress: bool, repeats: int) -> dict:
    row = {"dialect": name}
    if not parser_c(name).exists():
        row["error"] = "parser.c absent; run scripts/generate-all.js"
        return row

    row["keyword_extraction"] = has_keyword_extraction(name)

    work = grammar_dir(name) / "tmp" / "parse-bench"
    work.mkdir(parents=True, exist_ok=True)
    cfg = work / "ts-config.json"
    cfg.write_text('{"parser-directories": []}\n')
    try:
        # ── real workload ───────────────────────────────────────────────────
        stmts = corpus_statements(name) + probe_statements(name)
        kept = clean_statements(name, stmts, work, cfg)
        row["statements"] = {"collected": len(stmts), "parsed": len(kept)}
        text = build_real_input(kept)
        if text:
            real = work / "real.sql"
            real.write_text(text)
            time_files(name, [real], cfg, 1)          # warm the compiled parser
            res = time_files(name, [real], cfg, repeats)
            m = next(iter(res.values()), {})
            row["real"] = {
                "bytes": m.get("bytes"),
                "ms": round(m.get("ns", 0) / 1e6, 3),
                "bytes_per_ms": m.get("bytes_per_ms"),
                "successful": m.get("successful"),
            }
            real.unlink(missing_ok=True)
        else:
            row["real"] = {"error": "no parseable statements"}

        # ── stress workloads ────────────────────────────────────────────────
        if do_stress:
            files, meta = [], {}
            for sid, build, scale in STRESS:
                for tag, n in (("s", scale), ("2s", scale * 2)):
                    p = work / f"{sid}__{tag}.sql"
                    p.write_text(build(n) + "\n")
                    files.append(p)
                    meta[str(p)] = (sid, tag)
            time_files(name, files, cfg, 1)           # warm
            res = time_files(name, files, cfg, repeats)
            stress = {}
            for path, m in res.items():
                sid, tag = meta.get(path, (None, None))
                if sid is None:
                    continue
                stress.setdefault(sid, {})[tag] = {
                    "bytes": m["bytes"], "ms": round(m["ns"] / 1e6, 3),
                    "bytes_per_ms": m["bytes_per_ms"], "successful": m["successful"],
                }
            for sid, v in stress.items():
                a, b = v.get("s"), v.get("2s")
                # Time ratio when the input doubles: ~2 is linear, ~4 is quadratic.
                v["growth"] = (
                    round(b["ms"] / a["ms"], 2) if a and b and a["ms"] > 0 else None
                )
            row["stress"] = stress
            for p in files:
                p.unlink(missing_ok=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return row


# ─────────────────────────────────────────────────────────────────────────────
# Rendering
# ─────────────────────────────────────────────────────────────────────────────

def render_markdown(results: dict) -> str:
    rows = [r for r in results["dialects"].values() if "real" in r]
    ranked = sorted(
        rows, key=lambda r: -(r["real"].get("bytes_per_ms") or 0)
    )
    lines = [
        "# Parse-throughput benchmark",
        "",
        f"_Generated by `tools/parse_bench.py` on {results['generated_on']}. "
        "Do not edit by hand._",
        "",
        f"Real workload: each dialect's own corpus tests + coverage probes, repeated to "
        f"~{TARGET_BYTES // 1024} KiB. Timing is the minimum of "
        f"{results['repeats']} parses, from `tree-sitter parse --json-summary` "
        "(excludes process startup and parser compilation). Higher bytes/ms is better.",
        "",
        "| Dialect | bytes/ms | parse (ms) | input | statements | keyword extraction |",
        "|---|--:|--:|--:|--:|---|",
    ]
    for r in ranked:
        m, s = r["real"], r.get("statements", {})
        lines.append(
            f"| {r['dialect']} | {m.get('bytes_per_ms') or '—'} | {m.get('ms') or '—'} "
            f"| {(m.get('bytes') or 0) // 1024} KiB "
            f"| {s.get('parsed', '—')}/{s.get('collected', '—')} "
            f"| {'yes' if r.get('keyword_extraction') else '**NO**'} |"
        )

    missing = [d for d, r in results["dialects"].items() if r.get("error")]
    if missing:
        lines += ["", f"_Not benchmarked: {', '.join(missing)}._"]

    stressed = [r for r in rows if r.get("stress")]
    if stressed:
        ids = [sid for sid, _, _ in STRESS]
        lines += [
            "", "## Stress workloads; time growth when the input doubles", "",
            "A value near **2.0** is linear parsing. Values near or above **4.0** mean "
            "the parser is doing superlinear work on that shape, which is where GLR "
            "stack splitting shows up. `—` means the dialect rejects that input.", "",
            "| Dialect | " + " | ".join(ids) + " |",
            "|---" * (len(ids) + 1) + "|",
        ]
        for r in sorted(stressed, key=lambda r: r["dialect"]):
            cells = []
            for sid in ids:
                v = r["stress"].get(sid, {})
                ok = v.get("s", {}).get("successful") and v.get("2s", {}).get("successful")
                cells.append(str(v.get("growth")) if ok and v.get("growth") else "—")
            lines.append(f"| {r['dialect']} | " + " | ".join(cells) + " |")
    lines.append("")
    return "\n".join(lines)


def render_step_summary(results: dict) -> str:
    rows = [r for r in results["dialects"].values() if "real" in r]
    ranked = sorted(rows, key=lambda r: (r["real"].get("bytes_per_ms") or 0))
    lines = ["## Parse throughput", "", "| Dialect | bytes/ms |", "|---|--:|"]
    for r in ranked:
        lines.append(f"| {r['dialect']} | {r['real'].get('bytes_per_ms') or '—'} |")
    bad = [r["dialect"] for r in rows if not r.get("keyword_extraction")]
    if bad:
        lines += ["", f"**Keyword extraction MISSING: {', '.join(bad)}**"]
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description="SQL parse-throughput benchmark")
    ap.add_argument("--dialect", help="Bench a single grammar (name, or 'base')")
    ap.add_argument("--check", action="store_true",
                    help="CI gate: fail on throughput regression vs the committed baseline")
    ap.add_argument("--no-stress", action="store_true", help="Skip the pathological inputs")
    ap.add_argument("--repeats", type=int, default=REPEATS,
                    help=f"Parses per file; the minimum is kept (default {REPEATS})")
    ap.add_argument("--json-only", action="store_true", help="Do not write the markdown report")
    args = ap.parse_args()

    dialects = [args.dialect] if args.dialect else DIALECTS
    unknown = [d for d in dialects if d not in DIALECTS]
    if unknown:
        print(f"ERROR: unknown dialect(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    results = {
        "generated_on": date.today().isoformat(),
        "cli": CLI,
        "target_bytes": TARGET_BYTES,
        "repeats": args.repeats,
        "dialects": {},
    }
    for name in dialects:
        print(f"[bench] {name} ...", flush=True)
        t0 = time.monotonic()
        row = bench_dialect(name, do_stress=not args.no_stress, repeats=args.repeats)
        results["dialects"][name] = row
        if row.get("error"):
            print(f"[bench]   {row['error']}")
            continue
        m = row.get("real", {})
        kw = "" if row.get("keyword_extraction") else "  ⚠ NO KEYWORD EXTRACTION"
        print(f"[bench]   {m.get('bytes_per_ms')} bytes/ms  ({m.get('ms')} ms for "
              f"{(m.get('bytes') or 0) // 1024} KiB)  [{time.monotonic() - t0:.0f}s]{kw}")

    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a") as f:
            f.write(render_step_summary(results))

    if args.check:
        if not REPORT_JSON.exists():
            print("ERROR: tools/parse_bench.json missing; run parse_bench.py to create it.",
                  file=sys.stderr)
            return 1
        baseline = json.loads(REPORT_JSON.read_text())
        failures = []
        for d, r in results["dialects"].items():
            if not r.get("keyword_extraction") and not r.get("error"):
                failures.append(f"{d}: keyword extraction missing (no ts_lex_keywords)")
            was = baseline.get("dialects", {}).get(d, {}).get("real", {}).get("bytes_per_ms")
            now = r.get("real", {}).get("bytes_per_ms")
            if was and now and now < was * (1 - REGRESSION_TOLERANCE):
                failures.append(
                    f"{d}: throughput {was} -> {now} bytes/ms "
                    f"({100 * (1 - now / was):.0f}% slower)"
                )
        if failures:
            print("\nFAILED:")
            for f in failures:
                print(f"  ✗ {f}")
            return 1
        print("\nOK: no throughput regressions.")
        return 0

    if not args.dialect:
        REPORT_JSON.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n")
        if not args.json_only:
            REPORT_MD.write_text(render_markdown(results))
        print(f"\nWrote {REPORT_JSON.relative_to(ROOT)}"
              f"{'' if args.json_only else ' and ' + str(REPORT_MD.relative_to(ROOT))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
