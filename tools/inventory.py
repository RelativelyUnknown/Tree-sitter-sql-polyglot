#!/usr/bin/env python3
"""
Per-dialect statement inventory: what each engine documents, and how much of
it our grammar parses.

tools/coverage.py scores 60 shared features with one probe each, which says
whether a dialect regressed but not whether it is complete. This tool works
from each vendor's own statement index instead. tools/inventory/<dialect>.yml
lists every documented statement (with its doc URL and a usage tier) and one
minimal probe per documented clause or form, plus expression-level syntax
(operators, literals, types, special-form functions) and verbatim doc
examples.

Every probe is parsed by our dialect parser and by each reference parser from
coverage.py that knows the dialect (SQLGlot, sqlfluff, pglast, ANTLR):

  implemented   ours parses it
  gap           ours rejects it
  suspect       ours accepts it, every reference parser that knows the
                dialect rejects it (grammar too loose, or a bad probe)
  unconfirmed   ours rejects it and so does every reference parser: either
                a real gap the references also miss, or a probe that is not
                valid SQL; check the doc before trusting it

Score per dialect = Σ tier_weight × (implemented probes / probes) over the
applicable statements, so a statement that only parses in its simplest form
counts partially.

A dialect's inventory can be split across files: tools/inventory/<dialect>.yml
and any tools/inventory/<dialect>.<part>.yml are merged.

Usage:
  python tools/inventory.py                      # every dialect; writes tools/inventory-results/
  python tools/inventory.py --dialect postgres   # one dialect; prints every probe that isn't implemented
  python tools/inventory.py --file tools/inventory/postgres.core.yml
                                                 # one file; prints, writes no results
  python tools/inventory.py --validate           # schema check only, no parsing
  python tools/inventory.py --check              # CI gate: ours only, fail on regressions
  python tools/inventory.py --no-corroborate     # ours only, reuse cached reference verdicts
  python tools/inventory.py --report             # write docs/inventory.md from the results

Results are committed per dialect in tools/inventory-results/<dialect>.json and
are the baseline for --check. Reference parsers are slow at this size (sqlfluff
especially), so their verdicts are cached by a hash of the SQL, in those
results and in tools/inventory-results/.cache/ (gitignored); only new or
edited probes are re-corroborated. --check never runs them.
"""

import argparse
import hashlib
import importlib.util
import json
import re
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: pyyaml not installed. Run: pip install -r tools/requirements.txt", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
INVENTORY_DIR = ROOT / "tools" / "inventory"
RESULTS_DIR = ROOT / "tools" / "inventory-results"
CACHE_DIR = RESULTS_DIR / ".cache"
CORPUS_JSON = ROOT / "tools" / "corpus.json"
INVENTORY_MD = ROOT / "docs" / "inventory.md"

TIER_WEIGHT = {"high": 3, "medium": 2, "low": 1}
STATUSES = {"not-applicable", "not-sql"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9_]*$")

# coverage.py owns the reference parsers and the batched tree-sitter call;
# load it by path (a plain `import coverage` could pick up coverage.py the
# test-coverage package instead).
_spec = importlib.util.spec_from_file_location("_coverage_tool", ROOT / "tools" / "coverage.py")
cov = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cov)


# ─────────────────────────────────────────────────────────────────────────────
# Loading and validation
# ─────────────────────────────────────────────────────────────────────────────

def dialect_of(path: Path) -> str:
    return path.name.split(".")[0]


def inventory_files(only=None) -> dict:
    """{dialect: [part files]} for every (or one) dialect."""
    out = {}
    for f in sorted(INVENTORY_DIR.glob("*.yml")):
        out.setdefault(dialect_of(f), []).append(f)
    if only:
        if only not in out:
            print(f"ERROR: no tools/inventory/{only}*.yml", file=sys.stderr)
            sys.exit(2)
        out = {only: out[only]}
    return out


def load(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f) or {}


def merge(paths) -> dict:
    """One inventory from a dialect's part files (header from the first part)."""
    inv = {"statements": [], "expressions": []}
    for p in paths:
        part = load(p)
        for k in ("dialect", "engine", "version", "source"):
            inv.setdefault(k, part.get(k))
            if inv.get(k) is None:
                inv[k] = part.get(k)
        for section in ("statements", "expressions"):
            inv[section] += part.get(section) or []
    return inv


def entries(inv: dict):
    """(section, entry) for every statement and expression group."""
    for section in ("statements", "expressions"):
        for e in inv.get(section) or []:
            yield section, e


def validate(path: Path, inv: dict) -> list:
    errs = []
    where = path.name
    if inv.get("dialect") != dialect_of(path):
        errs.append(f"{where}: `dialect` must be {dialect_of(path)!r}")
    for key in ("engine", "source"):
        if not inv.get(key):
            errs.append(f"{where}: missing `{key}`")
    seen = set()
    for section, e in entries(inv):
        eid = e.get("id")
        tag = f"{where}:{section}/{eid}"
        if not eid or not ID_RE.match(str(eid)):
            errs.append(f"{tag}: bad or missing id")
            continue
        if (section, eid) in seen:
            errs.append(f"{tag}: duplicate id")
        seen.add((section, eid))
        if not e.get("name"):
            errs.append(f"{tag}: missing name")
        if not str(e.get("doc", "")).startswith("http"):
            errs.append(f"{tag}: missing doc URL")
        if e.get("tier") not in TIER_WEIGHT:
            errs.append(f"{tag}: tier must be one of {', '.join(TIER_WEIGHT)}")
        status = e.get("status")
        if status is not None and status not in STATUSES:
            errs.append(f"{tag}: status must be one of {', '.join(sorted(STATUSES))}")
        if status and not e.get("reason"):
            errs.append(f"{tag}: status {status} needs a reason")
        probes = e.get("probes") or []
        if not status and not probes:
            errs.append(f"{tag}: needs at least one probe (or a status)")
        pseen = set()
        for p in probes:
            pid = p.get("id")
            if not pid or not ID_RE.match(str(pid)):
                errs.append(f"{tag}: probe with bad or missing id")
                continue
            if pid in pseen:
                errs.append(f"{tag}/{pid}: duplicate probe id")
            pseen.add(pid)
            sql = p.get("sql")
            if not isinstance(sql, str) or not sql.strip():
                errs.append(f"{tag}/{pid}: missing sql")
        for i, ex in enumerate(e.get("examples") or []):
            if not isinstance(ex, str) or not ex.strip():
                errs.append(f"{tag}: example {i} is not a string")
    return errs


# ─────────────────────────────────────────────────────────────────────────────
# Parsing
# ─────────────────────────────────────────────────────────────────────────────

def sql_hash(sql: str) -> str:
    return hashlib.sha1(sql.encode()).hexdigest()[:16]


def collect(inv: dict):
    """{key: sql} for probes and doc examples of applicable entries."""
    probes, examples = {}, {}
    for section, e in entries(inv):
        if e.get("status"):
            continue
        for p in e.get("probes") or []:
            probes[f"{section}.{e['id']}.{p['id']}"] = p["sql"].strip()
        for i, ex in enumerate(e.get("examples") or []):
            examples[f"{section}.{e['id']}.example{i}"] = ex.strip()
    return probes, examples


def ours(dialect: str, items: dict) -> dict:
    """{key: bool}, parsed in batches of safe file names via coverage.ours_parses."""
    out = {}
    keys = list(items)
    for start in range(0, len(keys), 1500):
        chunk = keys[start:start + 1500]
        safe = {f"p{i}": items[k] for i, k in enumerate(chunk)}
        res = cov.ours_parses(dialect, safe)
        for i, k in enumerate(chunk):
            out[k] = bool(res.get(f"p{i}"))
    return out


def corroborate(dialect, items, corroborators, cache):
    """{key: {name: bool}}, reusing cached verdicts for unchanged SQL."""
    out = {}
    active = [c for c in corroborators if c.supports(dialect)]
    for k, sql in items.items():
        h = sql_hash(sql)
        cached = cache.get(h, {})
        verdicts = {}
        for c in active:
            if c.name in cached:
                verdicts[c.name] = cached[c.name]
            else:
                try:
                    verdicts[c.name] = bool(c.parses(sql, dialect))
                except Exception:
                    verdicts[c.name] = False
        cache[h] = {**cached, **verdicts}
        out[k] = verdicts
    return out


def classify(ok: bool, verdicts: dict) -> str:
    accepts = [n for n, v in verdicts.items() if v]
    if ok:
        return "suspect" if verdicts and not accepts else "implemented"
    return "gap" if accepts or not verdicts else "unconfirmed"


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────────────────────────────────────

def load_cache(dialect: str) -> dict:
    cache = {}
    for f in sorted(CACHE_DIR.glob(f"{dialect}.*json")) + sorted(CACHE_DIR.glob(f"{dialect}.json")):
        try:
            for h, v in json.loads(f.read_text()).items():
                cache[h] = {**cache.get(h, {}), **v}
        except (ValueError, OSError):
            pass
    res = RESULTS_DIR / f"{dialect}.json"
    if res.exists():
        for h, v in (json.loads(res.read_text()).get("corroboration_cache") or {}).items():
            cache[h] = {**v, **cache.get(h, {})}
    return cache


def evaluate_dialect(inv, corroborators, cache, run_corroborators=True):
    d = inv["dialect"]
    probes, examples = collect(inv)
    if not cov.has_parser(d):
        print(f"ERROR: {d} parser not generated (run node scripts/inflate-parsers.js)", file=sys.stderr)
        sys.exit(2)

    parsed = ours(d, {**probes, **examples})
    used = {sql_hash(s) for s in {**probes, **examples}.values()}
    if run_corroborators and corroborators:
        verdicts = corroborate(d, {**probes, **examples}, corroborators, cache)
    else:
        verdicts = {k: dict(cache.get(sql_hash(s), {})) for k, s in {**probes, **examples}.items()}

    stmts, got, total = {}, 0.0, 0
    for section, e in entries(inv):
        key = f"{section}.{e['id']}"
        rec = {"name": e["name"], "tier": e["tier"], "doc": e["doc"], "section": section}
        if e.get("status"):
            rec.update(status=e["status"], reason=e.get("reason"))
            stmts[key] = rec
            continue
        prs = {}
        for p in e.get("probes") or []:
            k = f"{key}.{p['id']}"
            prs[p["id"]] = {"sql": probes[k], "hash": sql_hash(probes[k]),
                            "status": classify(parsed[k], verdicts.get(k, {})),
                            "accepted_by": sorted(n for n, v in verdicts.get(k, {}).items() if v)}
        n_ok = sum(1 for p in prs.values() if p["status"] in ("implemented", "suspect"))
        ex = [parsed[f"{key}.example{i}"] for i in range(len(e.get("examples") or []))]
        rec.update(probes=prs, implemented=n_ok, total=len(prs),
                   status="full" if n_ok == len(prs) else "partial" if n_ok else "absent",
                   examples_parsed=sum(ex), examples_total=len(ex))
        stmts[key] = rec
        if section == "statements":
            w = TIER_WEIGHT[e["tier"]]
            total += w
            got += w * n_ok / len(prs)

    def count(section, status):
        return sum(1 for k, s in stmts.items() if s["section"] == section and s.get("status") == status)

    all_probes = [p for s in stmts.values() for p in (s.get("probes") or {}).values()]
    ex_ok = sum(s.get("examples_parsed", 0) for s in stmts.values())
    ex_n = sum(s.get("examples_total", 0) for s in stmts.values())
    return {
        "engine": inv.get("engine"), "version": inv.get("version"), "source": inv.get("source"),
        "score": round(100.0 * got / total, 1) if total else 0.0,
        "statements": {st: count("statements", st)
                       for st in ("full", "partial", "absent", "not-applicable", "not-sql")},
        "probes": {st: sum(1 for p in all_probes if p["status"] == st)
                   for st in ("implemented", "suspect", "gap", "unconfirmed")},
        "examples": {"parsed": ex_ok, "total": ex_n},
        "entries": stmts,
        "corroboration_cache": {h: v for h, v in sorted(cache.items()) if h in used},
    }


def print_dialect(d, r, verbose):
    s, p = r["statements"], r["probes"]
    print(f"[inventory] {d:<12} {r['score']:>5}%  statements full/partial/absent "
          f"{s['full']}/{s['partial']}/{s['absent']} (n/a {s['not-applicable'] + s['not-sql']})  "
          f"probes ok {p['implemented']} gap {p['gap']} unconfirmed {p['unconfirmed']} "
          f"suspect {p['suspect']}  examples {r['examples']['parsed']}/{r['examples']['total']}")
    if not verbose:
        return
    for key, st in r["entries"].items():
        for pid, pr in (st.get("probes") or {}).items():
            if pr["status"] != "implemented":
                by = f" (accepted by {', '.join(pr['accepted_by'])})" if pr["accepted_by"] else ""
                print(f"    {pr['status']:<11} {key}.{pid}{by}: {pr['sql'][:110]}")


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────

REPORT_FRONTMATTER = """---
title: Statement inventory
outline: [2, 3]
editLink: false
---

"""


def render_report(results: dict, corpus: dict) -> str:
    L = ["# Statement inventory", ""]
    L.append(
        "Every statement each engine documents, checked against our grammar. Each statement "
        "has one probe per documented clause or form, so a statement that only parses in its "
        "simplest form counts as partial. The score weights statements by how commonly they're "
        "used (high 3, medium 2, low 1). Source lists live in `tools/inventory/`.")
    L.append("")
    L.append("| Dialect | Version | Score | Full | Partial | Missing | Probes parsed | "
             "Doc examples parsed | Real-world SQL parsed |")
    L.append("|---|---|---|---|---|---|---|---|---|")
    for d in sorted(results, key=lambda x: (x != "base", x)):
        r = results[d]
        s, p, ex = r["statements"], r["probes"], r["examples"]
        n_p = sum(p.values())
        real = (corpus.get("dialects") or {}).get(d)
        real_s = f"{real['parsed']}/{real['total']} ({real['rate']}%)" if real and real.get("total") else "n/a"
        ex_s = f"{ex['parsed']}/{ex['total']}" if ex["total"] else "n/a"
        L.append(f"| [{d}](#{d}) | {r.get('engine') or ''} {r.get('version') or ''} | {r['score']}% "
                 f"| {s['full']} | {s['partial']} | {s['absent']} "
                 f"| {p['implemented'] + p['suspect']}/{n_p} | {ex_s} | {real_s} |")
    L.append("")
    for d in sorted(results, key=lambda x: (x != "base", x)):
        r = results[d]
        L.append(f"## {d}")
        L.append("")
        L.append(f"{r.get('engine') or d} {r.get('version') or ''}, from "
                 f"[the statement index]({r['source']}).")
        L.append("")
        gaps = []
        for key, st in r["entries"].items():
            if st.get("status") in STATUSES or st.get("status") == "full":
                continue
            missing = [pid for pid, pr in st["probes"].items()
                       if pr["status"] in ("gap", "unconfirmed")]
            gaps.append((-TIER_WEIGHT[st["tier"]], st["status"] != "absent", st["name"], st, missing))
        gaps.sort(key=lambda g: (g[0], g[1], g[2]))
        if gaps:
            L.append("### Gaps")
            L.append("")
            L.append("| Statement | Use | Missing forms |")
            L.append("|---|---|---|")
            for _, _, name, st, missing in gaps:
                what = "all" if st["status"] == "absent" else ", ".join(f"`{m}`" for m in missing)
                L.append(f"| [{name}]({st['doc']}) | {st['tier']} | {what} |")
            L.append("")
        clusters = ((corpus.get("dialects") or {}).get(d) or {}).get("clusters") or []
        if clusters:
            L.append("### Most common failures in real-world SQL")
            L.append("")
            L.append("| Starts with | Statements |")
            L.append("|---|---|")
            for c in clusters[:15]:
                L.append(f"| `{c['prefix']}` | {c['count']} |")
            L.append("")
        na = [st for st in r["entries"].values() if st.get("status") in STATUSES]
        if na:
            L.append("<details><summary>Not applicable or not SQL "
                     f"({len(na)})</summary>")
            L.append("")
            for st in na:
                L.append(f"- [{st['name']}]({st['doc']}): {st.get('reason')}")
            L.append("")
            L.append("</details>")
            L.append("")
    L.append(f"_Generated {date.today().isoformat()} by `tools/inventory.py`._")
    return "\n".join(L) + "\n"


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def load_results() -> dict:
    out = {}
    for f in sorted(RESULTS_DIR.glob("*.json")):
        out[f.stem] = json.loads(f.read_text())
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Per-dialect statement inventory")
    ap.add_argument("--dialect", help="Only this dialect; prints every probe that isn't implemented")
    ap.add_argument("--file", help="Only this inventory file; prints, writes no results")
    ap.add_argument("--validate", action="store_true", help="Schema check only")
    ap.add_argument("--check", action="store_true",
                    help="CI gate: our parser only; fail if a baseline-implemented probe now fails")
    ap.add_argument("--no-corroborate", action="store_true",
                    help="Skip reference parsers, reuse cached verdicts")
    ap.add_argument("--report", action="store_true", help="Write docs/inventory.md from the results")
    ap.add_argument("--skip-corroborator", action="append", default=[])
    args = ap.parse_args()

    if args.report:
        corpus = json.loads(CORPUS_JSON.read_text()) if CORPUS_JSON.exists() else {}
        INVENTORY_MD.parent.mkdir(parents=True, exist_ok=True)
        INVENTORY_MD.write_text(REPORT_FRONTMATTER + render_report(load_results(), corpus))
        print(f"Wrote {INVENTORY_MD.relative_to(ROOT)}")
        return 0

    if args.file:
        path = Path(args.file).resolve()
        groups = {dialect_of(path): [path]}
    else:
        groups = inventory_files(args.dialect)

    errs, seen = [], {}
    for d, paths in groups.items():
        for f in paths:
            inv = load(f)
            errs += validate(f, inv)
            for section, e in entries(inv):
                k = (d, section, e.get("id"))
                if k in seen and seen[k] != f.name:
                    errs.append(f"{f.name}:{section}/{e.get('id')}: also defined in {seen[k]}")
                seen[k] = f.name
    if errs:
        print("Inventory schema errors:", file=sys.stderr)
        for e in errs:
            print(f"  ✗ {e}", file=sys.stderr)
        return 1
    if args.validate:
        print(f"OK: {sum(len(p) for p in groups.values())} inventory file(s) valid.")
        return 0

    run_corr = not (args.check or args.no_corroborate)
    corroborators = []
    if run_corr:
        for cls in cov.ALL_CORROBORATORS:
            c = cls()
            if c.name not in args.skip_corroborator and c.available():
                corroborators.append(c)
        print(f"[inventory] corroborators: {', '.join(c.name for c in corroborators) or '(none)'}")

    results = {}
    for d, paths in groups.items():
        cache = load_cache(d)
        results[d] = evaluate_dialect(merge(paths), corroborators, cache, run_corroborators=run_corr)
        if run_corr:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            stem = Path(args.file).name[:-4] if args.file else d
            (CACHE_DIR / f"{stem}.json").write_text(json.dumps(results[d]["corroboration_cache"]))
        print_dialect(d, results[d], verbose=bool(args.dialect or args.file))

    if args.check:
        failures = []
        for d, r in results.items():
            res = RESULTS_DIR / f"{d}.json"
            was = (json.loads(res.read_text()).get("entries") or {}) if res.exists() else {}
            for key, st in r["entries"].items():
                for pid, pr in (st.get("probes") or {}).items():
                    old = ((was.get(key) or {}).get("probes") or {}).get(pid)
                    if (old and old["hash"] == pr["hash"]
                            and old["status"] in ("implemented", "suspect")
                            and pr["status"] not in ("implemented", "suspect")):
                        failures.append(f"{d}: {key}.{pid} used to parse: {pr['sql'][:100]}")
        if failures:
            print("\nFAILED: regressions against tools/inventory-results/:")
            for f in failures:
                print(f"  ✗ {f}")
            return 1
        print("\nOK: no inventory regressions.")
        return 0

    if args.file:
        return 0
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    for d, r in results.items():
        (RESULTS_DIR / f"{d}.json").write_text(json.dumps(r, indent=1, sort_keys=True) + "\n")
    print(f"\nWrote {len(results)} file(s) to {RESULTS_DIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
