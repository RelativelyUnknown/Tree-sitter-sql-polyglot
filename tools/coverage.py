#!/usr/bin/env python3
"""
Corroborated SQL feature-coverage tool (the single coverage entry point).

For every (dialect, feature) probe in tools/coverage-probes.yml this tool records:

  ours          does THIS grammar's compiled tree-sitter parser accept the probe
  <corroborator> does each independent reference parser accept it

The independent corroborators; SQLGlot, ANTLR (grammars-v4), pglast
(libpg_query, the real PostgreSQL parser) and sqlfluff; are what make the
metric trustworthy instead of self-referential. Agreement/disagreement is the
signal:

  suspect        ours accepts, but NO supporting corroborator does
                 → the grammar is too loose, or the probe is not real SQL.
  confirmed_gap  ours rejects, but ≥1 corroborator accepts
                 → a genuinely missing feature.

The base ("ANSI") grammar is scored as a first-class row against the ISO Core
features (ansi: true, observable). If you can write it as ANSI SQL and the base
cannot parse it, that is a real base gap; nothing is hidden in an
"out-of-scope" bucket. Only features with literally no probeable surface syntax
(observable: false; SQLSTATE status codes, host-language binding) are excluded.

Score = Σ weight(implemented) / Σ weight(applicable, observable).

Usage:
  python tools/coverage.py                     # score + write artifacts
  python tools/coverage.py --check             # CI gate (regressions / new suspects / purity)
  python tools/coverage.py --dialect duckdb    # single dialect (+ base)
  python tools/coverage.py --skip-missing      # ignore dialects without parsers
  python tools/coverage.py --skip-corroborator antlr   # run without a corroborator

Corroborators are HARD dependencies: a required corroborator that is entirely
unavailable aborts the run (exit 2) unless listed via --skip-corroborator. A
corroborator that simply does not know a given dialect reports that pair as
"unsupported" and is dropped from that probe's corroboration set; not a failure.

Artifacts:
  tools/coverage.json   machine-readable results (committed baseline for --check)
  docs/coverage.md      human-readable scorecard (generated; gitignored)
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
    print("ERROR: pyyaml not installed. Run: pip install -r tools/requirements.txt", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
FEATURES_FILE = ROOT / "tools" / "coverage-probes.yml"
COVERAGE_JSON = ROOT / "tools" / "coverage.json"
COVERAGE_MD = ROOT / "docs" / "coverage.md"
ANTLR_DIR = ROOT / "tools" / "antlr"

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


# ─────────────────────────────────────────────────────────────────────────────
# Independent corroborators
#
# Each maps our dialect names → the reference tool's own dialect id. A dialect
# absent from a map is "unsupported" by that corroborator (dropped from the
# probe's corroboration set, never counted as a rejection). Maps stay
# conservative (only native dialects, no approximations) so that a rejection
# genuinely means "this reference parser does not accept this SQL".
# ─────────────────────────────────────────────────────────────────────────────

SQLGLOT_DIALECT = {
    "base": None, "postgres": "postgres", "mysql": "mysql", "mariadb": "mysql",
    "tsql": "tsql", "oracle": "oracle", "sqlite": "sqlite", "hive": "hive",
    "spark": "spark", "databricks": "databricks", "snowflake": "snowflake",
    "bigquery": "bigquery", "redshift": "redshift", "trino": "trino",
    "athena": "athena", "duckdb": "duckdb", "clickhouse": "clickhouse",
    "teradata": "teradata",
}

SQLFLUFF_DIALECT = {
    "base": "ansi", "postgres": "postgres", "mysql": "mysql", "mariadb": "mariadb",
    "tsql": "tsql", "oracle": "oracle", "db2": "db2", "sqlite": "sqlite",
    "hive": "hive", "spark": "sparksql", "databricks": "databricks",
    "snowflake": "snowflake", "bigquery": "bigquery", "redshift": "redshift",
    "trino": "trino", "athena": "athena", "duckdb": "duckdb",
    "clickhouse": "clickhouse", "teradata": "teradata",
}

# pglast is the real PostgreSQL parser (libpg_query); use it only where the SQL
# is genuinely PostgreSQL, to avoid false rejections.
PGLAST_DIALECT = {"postgres": "postgres"}

# grammars-v4 grammar directory names. Only those actually built by
# tools/antlr/setup.sh are usable at runtime; the rest report unsupported.
ANTLR_DIALECT = {
    "base": "sql/sqlite",  # a permissive standalone SQL grammar for ANSI probes
    "postgres": "sql/postgresql", "mysql": "sql/mysql", "tsql": "sql/tsql",
    "oracle": "sql/plsql", "sqlite": "sql/sqlite", "snowflake": "sql/snowflake",
    "hive": "sql/hive", "clickhouse": "sql/clickhouse", "trino": "sql/trino",
    "mariadb": "sql/mysql",
}


class Corroborator:
    name = "base"

    def available(self) -> bool:
        return False

    def supports(self, dialect: str) -> bool:
        return False

    def parses(self, sql: str, dialect: str) -> bool:
        raise NotImplementedError


class SqlglotCorroborator(Corroborator):
    name = "sqlglot"

    def __init__(self):
        try:
            import sqlglot  # noqa: F401
            self._mod = sqlglot
        except ImportError:
            self._mod = None

    def available(self) -> bool:
        return self._mod is not None

    def supports(self, dialect: str) -> bool:
        return dialect in SQLGLOT_DIALECT

    def parses(self, sql: str, dialect: str) -> bool:
        try:
            tree = self._mod.parse_one(sql, read=SQLGLOT_DIALECT[dialect])
        except Exception:
            return False
        if tree is None:
            return False
        # sqlglot does not raise on syntax it has no model for: it warns
        # ("falling back to parsing as a 'Command'") and returns a Command node
        # wrapping the raw text. Counting that as acceptance made every
        # statement sqlglot has never heard of look like a gap in ours; 29 of
        # the 83 confirmed gaps were this, CREATE RULE and CREATE DATABASE LINK
        # among them. A Command result means "not modelled", so: not parsed.
        from sqlglot import expressions as sqlglot_exp
        if isinstance(tree, sqlglot_exp.Command):
            return False
        return not any(True for _ in tree.find_all(sqlglot_exp.Command))


class SqlfluffCorroborator(Corroborator):
    name = "sqlfluff"

    def __init__(self):
        try:
            import sqlfluff
            self._mod = sqlfluff
        except ImportError:
            self._mod = None

    def available(self) -> bool:
        return self._mod is not None

    def supports(self, dialect: str) -> bool:
        return dialect in SQLFLUFF_DIALECT

    def parses(self, sql: str, dialect: str) -> bool:
        from sqlfluff.api.simple import APIParsingError
        try:
            tree = self._mod.parse(sql, dialect=SQLFLUFF_DIALECT[dialect])
        except APIParsingError:
            return False
        except Exception:
            return False
        return not _dict_has_key(tree, "unparsable")


class PglastCorroborator(Corroborator):
    name = "pglast"

    def __init__(self):
        try:
            import pglast
            self._mod = pglast
        except ImportError:
            self._mod = None

    def available(self) -> bool:
        return self._mod is not None

    def supports(self, dialect: str) -> bool:
        return dialect in PGLAST_DIALECT

    def parses(self, sql: str, dialect: str) -> bool:
        try:
            self._mod.parse_sql(sql)
            return True
        except Exception:
            return False


class AntlrCorroborator(Corroborator):
    """Shells out to the grammars-v4 runner built by tools/antlr/setup.sh.

    The runner contract: `bash tools/antlr/run.sh <grammar_dir> <start_rule>`
    reads SQL on stdin and exits 0 iff the input parses with no syntax errors.
    A grammar that setup.sh did not build is reported unsupported.
    """
    name = "antlr"

    def __init__(self):
        self._runner = ANTLR_DIR / "run.sh"
        self._built = ANTLR_DIR / "build"

    def available(self) -> bool:
        return self._runner.exists()

    def _grammar_built(self, dialect: str) -> bool:
        g = ANTLR_DIALECT.get(dialect)
        if not g:
            return False
        return (self._built / g.replace("/", "_")).exists()

    def supports(self, dialect: str) -> bool:
        return self.available() and self._grammar_built(dialect)

    def parses(self, sql: str, dialect: str) -> bool:
        g = ANTLR_DIALECT[dialect]
        try:
            proc = subprocess.run(
                ["bash", str(self._runner), g],
                input=sql, capture_output=True, text=True, timeout=60,
            )
            return proc.returncode == 0
        except Exception:
            return False


def _dict_has_key(obj, key) -> bool:
    if isinstance(obj, dict):
        if key in obj:
            return True
        return any(_dict_has_key(v, key) for v in obj.values())
    if isinstance(obj, list):
        return any(_dict_has_key(v, key) for v in obj)
    return False


ALL_CORROBORATORS = [
    SqlglotCorroborator, PglastCorroborator, SqlfluffCorroborator, AntlrCorroborator,
]


# ─────────────────────────────────────────────────────────────────────────────
# Our own parser (tree-sitter)
# ─────────────────────────────────────────────────────────────────────────────

def load_registry() -> dict:
    with open(FEATURES_FILE) as f:
        return yaml.safe_load(f)


def dialect_dir(name: str) -> Path:
    return ROOT if name == "base" else ROOT / name


def has_parser(name: str) -> bool:
    # Existence is the signal. (An earlier mtime check "grammar.json newer than
    # parser.c" produced false negatives: tree-sitter 0.26 always rewrites
    # grammar.json but preserves an unchanged parser.c, so grammar.json is
    # routinely newer even for a fully-generated, correct parser.)
    return (dialect_dir(name) / "src" / "parser.c").exists()


def probe_for(feature: dict, dialect: str):
    """Returns (probe_sql, not_applicable_reason). Exactly one is non-None."""
    override = (feature.get("dialects") or {}).get(dialect) or {}
    if override.get("status") == "not-applicable":
        return None, override.get("reason", "not applicable")
    return override.get("probe", feature["probe"]), None


def ours_parses(dialect: str, probes: dict) -> dict:
    """Parse each probe with the dialect's tree-sitter parser. {feature_id: ok}.

    Uses one `tree-sitter parse -q` over a temp file per probe. Grammar
    resolution is forced file-relative with an empty parser-directories config,
    so a global ~/.config/tree-sitter config cannot silently reroute every .sql
    to the base grammar (see the original scorecard for the full rationale).
    """
    results: dict = {}
    if not probes:
        return results
    probe_dir = dialect_dir(dialect) / "tmp" / "coverage-probes"
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
            cmd, cwd=dialect_dir(dialect), capture_output=True, text=True, timeout=600,
        )
        failed_output = proc.stdout + proc.stderr
        for path, fid in files.items():
            rel = str(Path(path).relative_to(dialect_dir(dialect)))
            results[fid] = path not in failed_output and rel not in failed_output
        if proc.returncode not in (0, 1):
            for fid in files.values():
                results[fid] = False
    finally:
        shutil.rmtree(probe_dir, ignore_errors=True)
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────────────────────────────────────

def base_scored(feature: dict) -> bool:
    """A feature counts toward the base Core score iff it is an observable ANSI
    feature. observable: false has no probeable syntax; ansi: false is an
    extension the base must reject (handled by the purity check, not the score).
    """
    return bool(feature.get("ansi")) and feature.get("observable", True) is not False


def evaluate(reg: dict, only_dialect, skip_missing, corroborators) -> dict:
    dialects = list(reg["dialects"].keys())
    if only_dialect:
        if only_dialect not in dialects:
            print(f"ERROR: unknown dialect '{only_dialect}'", file=sys.stderr)
            sys.exit(2)
        dialects = ["base"] if only_dialect == "base" else ["base", only_dialect]

    missing = [d for d in dialects if not has_parser(d)]
    if missing:
        msg = f"Parsers not generated for: {', '.join(missing)} (run npm run generate:all)"
        if skip_missing:
            print(f"WARNING: {msg}, skipping")
            dialects = [d for d in dialects if d not in missing]
        else:
            print(f"ERROR: {msg}", file=sys.stderr)
            sys.exit(2)

    features = reg["features"]
    out = {"dialects": {}, "purity": {"violations": [], "exceptions": []},
           "suspect": [], "confirmed_gaps": []}

    for d in dialects:
        # Collect probes to run with our parser + corroborators.
        probes, reasons, not_observable = {}, {}, set()
        for feat in features:
            fid = feat["id"]
            if feat.get("observable", True) is False:
                not_observable.add(fid)
                continue
            sql, na_reason = probe_for(feat, d)
            if na_reason is not None:
                reasons[fid] = na_reason
            else:
                probes[fid] = sql

        parsed = ours_parses(d, probes)

        feats, got, total = {}, 0, 0
        for feat in features:
            fid, w = feat["id"], feat["weight"]

            if fid in not_observable:
                feats[fid] = {"status": "not-observable"}
                continue
            if fid in reasons:
                feats[fid] = {"status": "not-applicable", "reason": reasons[fid]}
                continue

            sql = probes[fid]
            ours_ok = bool(parsed.get(fid))

            # Corroborate.
            corr = {}
            for c in corroborators:
                if c.supports(d):
                    corr[c.name] = c.parses(sql, d)
            accepts = [n for n, v in corr.items() if v]
            supporters = [n for n, v in corr.items()]

            # A feature is "in scope" (scored) for the base only when it is an
            # observable ANSI feature; for a dialect, whenever it is applicable.
            # Base rejecting an ansi:false extension is purity-correct, NOT a gap.
            in_scope = base_scored(feat) if d == "base" else True

            entry = {
                "status": "implemented" if ours_ok else "absent",
                "scored": in_scope,
                "corroboration": {"accept": sorted(accepts),
                                  "reject": sorted(n for n in supporters if n not in accepts)},
            }

            # Integrity signals.
            if ours_ok and supporters and not accepts:
                entry["suspect"] = True
                out["suspect"].append({"dialect": d, "feature": fid,
                                       "asked": sorted(supporters)})
            if (not ours_ok) and accepts and in_scope:
                entry["confirmed_gap"] = True
                out["confirmed_gaps"].append({"dialect": d, "feature": fid,
                                              "accepted_by": sorted(accepts)})

            if in_scope:
                total += w
                if ours_ok:
                    got += w
            feats[fid] = entry

        out["dialects"][d] = {
            "score": round(100.0 * got / total, 1) if total else 0.0,
            "weight_implemented": got,
            "weight_applicable": total,
            "features": feats,
        }

        # ANSI purity (base only): base must reject ansi:false extensions.
        if d == "base":
            for feat in features:
                fid = feat["id"]
                ent = feats.get(fid, {})
                accepted = ent.get("status") == "implemented"
                if not feat.get("ansi") and feat.get("observable", True) is not False:
                    if accepted:
                        rec = {"feature": fid, "kind": "extension-accepted-by-base"}
                        if feat.get("purity_exception"):
                            out["purity"]["exceptions"].append(rec)
                        else:
                            out["purity"]["violations"].append(rec)

    return out


# ─────────────────────────────────────────────────────────────────────────────
# Rendering
# ─────────────────────────────────────────────────────────────────────────────

def _corr_summary(dres: dict) -> str:
    """Fraction of scored probes with ≥1 corroborator that agrees with 'ours'."""
    total = corrob = 0
    for v in dres["features"].values():
        if v["status"] not in ("implemented", "absent") or not v.get("scored"):
            continue
        total += 1
        c = v.get("corroboration", {})
        if v["status"] == "implemented" and c.get("accept"):
            corrob += 1
        elif v["status"] == "absent" and not c.get("accept"):
            corrob += 1
    return f"{corrob}/{total}" if total else "0/0"


def render_markdown(reg: dict, results: dict) -> str:
    features = reg["features"]
    meta = reg["dialects"]
    dialects = list(results["dialects"])
    ordered = ["base"] + sorted((d for d in dialects if d != "base"),
                                key=lambda x: -results["dialects"][x]["score"])

    lines = [
        "# Dialect feature coverage",
        "",
        f"_Generated by `tools/coverage.py` on {date.today().isoformat()}. Do not edit by hand._",
        "",
        "Every probe is parsed by this grammar and by independent reference "
        "parsers (SQLGlot, ANTLR grammars-v4, pglast, sqlfluff). A feature is not "
        "\"covered\" just because our own grammar accepts our own probe.",
        "",
        "Legend: `yes` implemented, `no` absent (tracked gap), `n/a` not applicable, "
        "`-` not observable.",
        "",
        "## Scores",
        "",
        "| Dialect | Parent | Score | Implemented / Applicable | Agrees with references |",
        "|---|---|---|---|---|",
    ]
    for d in ordered:
        r = results["dialects"][d]
        m = meta.get(d, {})
        label = "**base (ANSI Core)**" if d == "base" else f"**{d}**"
        lines.append(f"| {label} | {m.get('parent') or 'none'} | **{r['score']}%** "
                     f"| {r['weight_implemented']} / {r['weight_applicable']} | {_corr_summary(r)} |")

    suspects = results["suspect"]
    gaps = results["confirmed_gaps"]

    lines += ["", "## Suspect probes",
              "", "_Our grammar accepts these, but no independent parser does. The grammar may be "
              "too loose, or the probe may not be real SQL._", ""]
    if suspects:
        for s in suspects:
            lines.append(f"- `{s['dialect']}` / `{s['feature']}`, asked: {', '.join(s['asked'])}")
    else:
        lines.append("None.")

    lines += ["", "## Confirmed gaps",
              "", "_Our grammar rejects these, but at least one independent parser accepts them. "
              "These are genuinely missing features._", ""]
    if gaps:
        for g in gaps:
            lines.append(f"- `{g['dialect']}` / `{g['feature']}`, accepted by: {', '.join(g['accepted_by'])}")
    else:
        lines.append("None.")

    lines += ["", "## Feature matrix", ""]
    header = "| Feature (ISO, weight) | " + " | ".join(ordered) + " |"
    lines.append(header)
    lines.append("|---" * (len(ordered) + 1) + "|")
    icon = {"implemented": "yes", "absent": "no", "not-applicable": "n/a", "not-observable": "-"}
    for feat in features:
        fid = feat["id"]
        iso = feat.get("iso", "n/a")
        row = [f"`{fid}` ({iso}, {feat['weight']})"]
        for d in ordered:
            st = results["dialects"][d]["features"][fid]["status"]
            row.append(icon.get(st, "?"))
        lines.append("| " + " | ".join(row) + " |")

    pur = results["purity"]
    lines += ["", "## ANSI purity (base grammar)", ""]
    if pur["violations"]:
        lines.append("**Violations (must be fixed):**")
        for v in pur["violations"]:
            lines.append(f"- `{v['feature']}`: {v['kind']}")
    else:
        lines.append("No purity violations.")
    lines.append("")
    return "\n".join(lines)


def render_step_summary(results: dict) -> str:
    lines = ["## SQL feature coverage (corroborated)", "",
             "| Dialect | Score | Implemented / Applicable | Agrees with references |",
             "|---|---|---|---|"]
    ordered = ["base"] + sorted((d for d in results["dialects"] if d != "base"),
                                key=lambda x: -results["dialects"][x]["score"])
    for d in ordered:
        r = results["dialects"][d]
        lines.append(f"| {d} | {r['score']}% | {r['weight_implemented']}/{r['weight_applicable']} | {_corr_summary(r)} |")
    if results["suspect"]:
        lines += ["", f"**{len(results['suspect'])} suspect probe(s)** (ours accepts, no reference parser does):"]
        lines += [f"- `{s['dialect']}`/`{s['feature']}`" for s in results["suspect"][:20]]
    else:
        lines += ["", "No suspect probes."]
    if results["purity"]["violations"]:
        lines += ["", f"**{len(results['purity']['violations'])} ANSI purity violation(s).**"]
    lines.append("")
    return "\n".join(lines)


def write_step_summary(results: dict) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a") as f:
        f.write(render_step_summary(results))


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description="Corroborated SQL feature-coverage tool")
    ap.add_argument("--check", action="store_true",
                    help="CI gate: fail on regressions, new suspect probes, or purity violations")
    ap.add_argument("--dialect", help="Score a single dialect (plus base)")
    ap.add_argument("--skip-missing", action="store_true",
                    help="Skip dialects whose parser is not generated")
    ap.add_argument("--skip-corroborator", action="append", default=[],
                    help="Run without a corroborator (repeatable). Otherwise all are hard deps.")
    args = ap.parse_args()

    # Wire corroborators; enforce hard-dependency semantics.
    corroborators, unavailable = [], []
    for cls in ALL_CORROBORATORS:
        c = cls()
        if c.name in args.skip_corroborator:
            continue
        if c.available():
            corroborators.append(c)
        else:
            unavailable.append(c.name)
    if unavailable:
        print(f"ERROR: required corroborator(s) unavailable: {', '.join(unavailable)}.\n"
              f"       Install with `pip install -r tools/requirements.txt` and run "
              f"`tools/antlr/setup.sh`, or pass --skip-corroborator <name>.", file=sys.stderr)
        return 2
    print(f"[coverage] corroborators: {', '.join(c.name for c in corroborators) or '(none)'}")

    reg = load_registry()
    results = evaluate(reg, args.dialect, args.skip_missing, corroborators)

    ordered = ["base"] + sorted((d for d in results["dialects"] if d != "base"),
                                key=lambda x: -results["dialects"][x]["score"])
    for d in ordered:
        r = results["dialects"][d]
        gaps = [f for f, v in r["features"].items()
                if v["status"] == "absent" and v.get("scored")]
        note = f"  gaps: {', '.join(gaps)}" if gaps else ""
        print(f"[coverage] {d:<12} {r['score']:>5}%  ({r['weight_implemented']}/{r['weight_applicable']})"
              f"  agree {_corr_summary(r)}{note}")

    if results["suspect"]:
        print("\n[suspect] ours accepts, no reference parser does:")
        for s in results["suspect"]:
            print(f"  ! {s['dialect']}/{s['feature']} (asked: {', '.join(s['asked'])})")
    if results["confirmed_gaps"]:
        print("\n[confirmed gaps] ours rejects, a reference parser accepts:")
        for g in results["confirmed_gaps"]:
            print(f"  ✗ {g['dialect']}/{g['feature']} (accepted by: {', '.join(g['accepted_by'])})")
    violations = results["purity"]["violations"]
    if violations:
        print("\n[purity] ANSI purity violations:")
        for v in violations:
            print(f"  ✗ {v['feature']}: {v['kind']}")

    write_step_summary(results)

    if args.check:
        if not COVERAGE_JSON.exists():
            print("ERROR: tools/coverage.json missing. Run coverage.py to create it.", file=sys.stderr)
            return 1
        baseline = json.loads(COVERAGE_JSON.read_text())
        failures = []
        for d, r in results["dialects"].items():
            base_d = baseline.get("dialects", {}).get(d)
            if not base_d:
                continue
            for fid, v in r["features"].items():
                was = base_d.get("features", {}).get(fid, {}).get("status")
                if was == "implemented" and v["status"] == "absent":
                    failures.append(f"regression {d}/{fid}: implemented → absent")
        base_suspects = {(s["dialect"], s["feature"]) for s in baseline.get("suspect", [])}
        for s in results["suspect"]:
            if (s["dialect"], s["feature"]) not in base_suspects:
                failures.append(f"new suspect {s['dialect']}/{s['feature']}")
        if violations:
            failures.append(f"{len(violations)} ANSI purity violation(s)")
        if failures:
            print("\nFAILED:")
            for f in failures:
                print(f"  ✗ {f}")
            return 1
        print("\nOK: no regressions, no new suspects, purity intact.")
        return 0

    if not args.dialect:
        COVERAGE_JSON.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n")
        COVERAGE_MD.parent.mkdir(parents=True, exist_ok=True)
        COVERAGE_MD.write_text(VITEPRESS_FRONTMATTER + render_markdown(reg, results))
        print(f"\nWrote {COVERAGE_JSON.relative_to(ROOT)} and {COVERAGE_MD.relative_to(ROOT)}")

    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
