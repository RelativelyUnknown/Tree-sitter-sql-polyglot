#!/usr/bin/env python3
"""
Real-world parse rate: how much third-party and vendor test SQL each dialect
parses.

The statement inventory (tools/inventory.py) measures coverage against the
vendor's documentation, one minimal probe per documented form. This measures
the other side: SQL people actually write, taken from test suites that are
valid by construction. The sources are pinned in tools/corpus-sources.yml:

  sqlfluff fixtures    test/fixtures/dialects/<d>/*.sql, split into statements
                       by sqlfluff's own parser; statements sqlfluff can't parse
                       are dropped
  sqlglot tests        validate_identity(...) strings and validate_all(...,
                       read={<d>: ...}) inputs from tests/dialects/test_<d>.py
  postgres regress     src/test/regress/sql, psql meta-commands and COPY data
                       stripped, split and filtered by pglast (the real
                       PostgreSQL parser)
  cockroach testdata   pkg/sql/parser/testdata `parse` blocks (not `error`)
  duckdb tests         test/sql/**/*.test `statement ok` and `query` blocks
  clickhouse tests     tests/queries/0_stateless/*.sql, minus statements the
                       test marks as a client or syntax error

Every kept statement is parsed in-process by our dialect parser (the shared
library tree-sitter builds in ~/.cache/tree-sitter/lib). A statement fails if
its tree has an ERROR or MISSING node. Failures are grouped by their leading
keywords and the token where our parse first breaks, which ranks the gaps
that real SQL hits most.

Usage:
  python tools/corpus_audit.py --fetch           # clone the pinned sources
  python tools/corpus_audit.py                   # all dialects; writes tools/corpus.json
  python tools/corpus_audit.py --dialect duckdb --show 20
"""

import argparse
import ast
import ctypes
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "tools" / "corpus-sources.yml"
CACHE = ROOT / "tools" / "corpus-cache"
EXTRACTED = CACHE / "extracted"
OUT = ROOT / "tools" / "corpus.json"
TS_LIB = Path(os.environ.get("TREE_SITTER_LIBDIR", Path.home() / ".cache" / "tree-sitter" / "lib"))

# Per source and dialect, at most this many statements (a deterministic sample
# by hash when there are more); the cap is logged and recorded.
CAP = 20000

STARTERS = set("""
SELECT WITH INSERT UPDATE DELETE MERGE CREATE ALTER DROP TRUNCATE GRANT REVOKE DENY SHOW
DESCRIBE DESC EXPLAIN SET UNSET USE BEGIN COMMIT ROLLBACK START SAVEPOINT RELEASE END ABORT
CALL EXEC EXECUTE DECLARE VALUES TABLE COPY UNLOAD LOAD ANALYZE VACUUM OPTIMIZE PIVOT UNPIVOT
FROM REPLACE UPSERT COMMENT RENAME LOCK UNLOCK CACHE UNCACHE REFRESH MSCK PREPARE DEALLOCATE
KILL ATTACH DETACH EXPORT IMPORT INSTALL SUMMARIZE PRAGMA CHECKPOINT PUT GET LIST REMOVE UNDROP
SYSTEM RESET FLUSH CLUSTER REINDEX LISTEN NOTIFY UNLISTEN DO IF WHILE LOOP FOR REPEAT RETURN
RAISE PRINT THROW SIGNAL RESIGNAL OPEN FETCH CLOSE MOVE DISCARD SECURITY HANDLER XA PURGE
FLASHBACK AUDIT NOAUDIT ASSOCIATE DISASSOCIATE CONNECT DISCONNECT WAITFOR BACKUP RESTORE DBCC
BULK READTEXT WRITETEXT UPDATETEXT SETUSER REVERT CHECK REPAIR CHECKSUM INSTALL UNINSTALL
SEL DEL INS UPD HELP COLLECT DATABASE MODIFY GIVE RENAME LOGON LOGOFF
""".split())


# ─────────────────────────────────────────────────────────────────────────────
# Fetching
# ─────────────────────────────────────────────────────────────────────────────

def load_config() -> dict:
    return yaml.safe_load(SOURCES.read_text())


def fetch(cfg: dict) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    for name, src in cfg["sources"].items():
        d = CACHE / name
        run = lambda *a: subprocess.run(["git", "-C", str(d), *a], check=True,
                                        stdout=subprocess.DEVNULL)
        if not (d / ".git").exists():
            subprocess.run(["git", "init", "-q", str(d)], check=True)
            run("remote", "add", "origin", src["repo"])
        run("sparse-checkout", "set", "--no-cone", *src["paths"])
        run("fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", src["commit"])
        run("checkout", "-q", "FETCH_HEAD")
        print(f"[corpus] {name} @ {src['commit'][:10]}")


# ─────────────────────────────────────────────────────────────────────────────
# Adapters: each returns a list of statement strings
# ─────────────────────────────────────────────────────────────────────────────

def _cached(key: str, build):
    """Extraction is slow for some sources (sqlfluff parses every fixture), so
    each adapter's output is cached next to the clone."""
    EXTRACTED.mkdir(parents=True, exist_ok=True)
    f = EXTRACTED / f"{key}.json"
    if f.exists():
        return json.loads(f.read_text())
    stmts = build()
    f.write_text(json.dumps(stmts))
    return stmts


def sqlfluff_fixtures(dialect: str) -> list:
    """Top-level statements of every fixture, split by sqlfluff's parser.
    Statements with unparsable segments are dropped: sqlfluff itself doesn't
    vouch for them."""
    from sqlfluff.core import FluffConfig, Linter

    def build():
        linter = Linter(config=FluffConfig(overrides={"dialect": dialect}))
        out = []
        for f in sorted((CACHE / "sqlfluff" / "test" / "fixtures" / "dialects" / dialect).glob("*.sql")):
            try:
                tree = linter.parse_string(f.read_text(errors="replace")).tree
            except Exception:
                continue
            if tree is None:
                continue
            for seg in tree.segments:
                if seg.is_type("statement") or seg.is_type("batch"):
                    if any(True for _ in seg.recursive_crawl("unparsable")):
                        continue
                    sql = seg.raw.strip()
                    if sql:
                        out.append(sql.rstrip(";") + ";")
        return out
    return _cached(f"sqlfluff-{dialect}", build)


def sqlglot_tests(dialect: str) -> list:
    """validate_identity() inputs from test_<dialect>.py, and validate_all()
    `read` entries for this dialect from every test file. Identity checks that
    expect sqlglot to fall back to an opaque Command are skipped."""
    def build():
        out = []
        for f in sorted((CACHE / "sqlglot" / "tests" / "dialects").glob("test_*.py")):
            tree = ast.parse(f.read_text())
            file_dialect = None
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign) and any(
                        isinstance(t, ast.Name) and t.id == "dialect" for t in node.targets):
                    if isinstance(node.value, ast.Constant):
                        file_dialect = node.value.value
            for node in ast.walk(tree):
                if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
                    continue
                kw = {k.arg: k.value for k in node.keywords}
                if node.func.attr == "validate_identity" and file_dialect == dialect:
                    if "check_command_warning" in kw:
                        continue
                    if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                        out.append(node.args[0].value)
                elif node.func.attr == "validate_all" and isinstance(kw.get("read"), ast.Dict):
                    for k, v in zip(kw["read"].keys, kw["read"].values):
                        if (isinstance(k, ast.Constant) and k.value == dialect
                                and isinstance(v, ast.Constant) and isinstance(v.value, str)):
                            out.append(v.value)
        keep = []
        for s in out:
            first = re.match(r"\s*\(?\s*([A-Za-z_]+)", s)
            if first and first.group(1).upper() in STARTERS:
                keep.append(s.strip().rstrip(";") + ";")
        return keep
    return _cached(f"sqlglot-{dialect}", build)


def postgres_regress() -> list:
    """src/test/regress/sql with psql meta-commands and COPY ... FROM stdin data
    removed, split by PostgreSQL's own scanner and kept only where pglast (the
    real PostgreSQL parser) accepts the statement."""
    import pglast

    def build():
        out = []
        for f in sorted((CACHE / "postgres" / "src" / "test" / "regress" / "sql").glob("*.sql")):
            lines, skipping = [], False
            for line in f.read_text(errors="replace").splitlines():
                if skipping:
                    if line.strip() == "\\.":
                        skipping = False
                    continue
                if line.lstrip().startswith("\\"):
                    continue
                if re.match(r"(?i)^\s*copy\b.*\bfrom\s+stdin", line):
                    skipping = True
                lines.append(line)
            text = "\n".join(lines)
            try:
                parts = pglast.split(text, with_parser=False)
            except Exception:
                continue
            for s in parts:
                s = s.strip()
                if not s:
                    continue
                try:
                    pglast.parse_sql(s)
                except Exception:
                    continue
                out.append(s + ";")
        return out
    return _cached("postgres-regress", build)


def cockroach_testdata() -> list:
    """`parse` blocks from pkg/sql/parser/testdata (the parser's own positive
    test cases); `error` blocks are skipped."""
    def build():
        out = []
        for f in sorted((CACHE / "cockroach" / "pkg" / "sql" / "parser" / "testdata").glob("*")):
            text = f.read_text(errors="replace")
            for m in re.finditer(r"(?ms)^parse\n(.*?)\n----\n", text):
                s = m.group(1).strip()
                if s:
                    out.append(s.rstrip(";") + ";")
        return out
    return _cached("cockroach-testdata", build)


def duckdb_tests() -> list:
    """`statement ok` and `query ...` blocks from test/sql/**/*.test, minus
    blocks that use the test runner's ${var} substitution."""
    def build():
        out = []
        for f in sorted((CACHE / "duckdb" / "test" / "sql").rglob("*.test")):
            lines = f.read_text(errors="replace").splitlines()
            i = 0
            while i < len(lines):
                head = lines[i].strip()
                if head == "statement ok" or head.startswith("query "):
                    body = []
                    i += 1
                    while i < len(lines) and lines[i].strip() and lines[i].strip() != "----":
                        body.append(lines[i])
                        i += 1
                    s = "\n".join(body).strip()
                    if s and "${" not in s and "__TEST_DIR__" not in s:
                        out.append(s.rstrip(";") + ";")
                i += 1
        return out
    return _cached("duckdb-tests", build)


def _split_simple(text: str) -> list:
    """Split on semicolons outside quotes and comments (no procedural blocks in
    the ClickHouse test suite)."""
    out, buf, i, n = [], [], 0, len(text)
    while i < n:
        c = text[i]
        if c in "'\"`":
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            buf.append(text[i:j + 1])
            i = j + 1
            continue
        if text.startswith("--", i):
            j = text.find("\n", i)
            j = n if j == -1 else j
            buf.append(text[i:j])
            i = j
            continue
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            j = n if j == -1 else j + 2
            buf.append(text[i:j])
            i = j
            continue
        if c == ";":
            # Trailing same-line comment belongs to this statement (it carries
            # the test's error annotation).
            j = text.find("\n", i)
            j = n if j == -1 else j
            out.append("".join(buf) + text[i:j])
            buf = []
            i = j
            continue
        buf.append(c)
        i += 1
    if "".join(buf).strip():
        out.append("".join(buf))
    return out


def clickhouse_tests() -> list:
    """tests/queries/0_stateless/*.sql, minus statements annotated as a client
    or syntax error and statements using the test harness's {CLICKHOUSE_*}
    substitutions."""
    def build():
        out = []
        for f in sorted((CACHE / "clickhouse" / "tests" / "queries" / "0_stateless").glob("*.sql")):
            for s in _split_simple(f.read_text(errors="replace")):
                if "clientError" in s or "SYNTAX_ERROR" in s or "{CLICKHOUSE_" in s or "${" in s:
                    continue
                body = re.sub(r"--[^\n]*$", "", s.strip()).strip()
                body = re.sub(r"^(\s*--[^\n]*\n)+", "", body).strip()
                if body and not body.startswith("--"):
                    out.append(body.rstrip(";") + ";")
        return out
    return _cached("clickhouse-tests", build)


def statements_for(adapter: str) -> list:
    if adapter.startswith("sqlfluff:"):
        return sqlfluff_fixtures(adapter.split(":", 1)[1])
    if adapter.startswith("sqlglot:"):
        return sqlglot_tests(adapter.split(":", 1)[1])
    return {"postgres_regress": postgres_regress, "cockroach_testdata": cockroach_testdata,
            "duckdb_tests": duckdb_tests, "clickhouse_tests": clickhouse_tests}[adapter]()


# ─────────────────────────────────────────────────────────────────────────────
# Parsing and clustering
# ─────────────────────────────────────────────────────────────────────────────

def grammar_name(dialect: str) -> str:
    if dialect == "base":
        return "sql"
    src = (ROOT / dialect / "grammar.js").read_text()
    return re.search(r"name:\s*'([^']+)'", src).group(1)


def load_language(dialect: str):
    from tree_sitter import Language
    name = grammar_name(dialect)
    lib = TS_LIB / f"{name}.so"
    if not lib.exists():
        sys.exit(f"ERROR: {lib} missing; run `tree-sitter parse` once in {dialect}/ to build it")
    so = ctypes.cdll.LoadLibrary(str(lib))
    fn = getattr(so, f"tree_sitter_{name}")
    fn.restype = ctypes.c_void_p
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        return Language(fn())


def first_error(node):
    if node.type == "ERROR" or node.is_missing:
        return node
    if not node.has_error:
        return None
    for c in node.children:
        e = first_error(c)
        if e is not None:
            return e
    return None


SKIP_WORDS = {"OR", "REPLACE", "TEMP", "TEMPORARY", "UNIQUE", "GLOBAL", "LOCAL", "EXTERNAL",
              "MATERIALIZED", "IF", "NOT", "EXISTS", "TRANSIENT", "VOLATILE", "SECURE", "RECURSIVE",
              "UNLOGGED", "DEFINER", "ALGORITHM"}


def lead_of(sql: str) -> str:
    text = re.sub(r"(?s)/\*.*?\*/", " ", sql)
    text = re.sub(r"--[^\n]*", " ", text)
    words = re.findall(r"[A-Za-z_][A-Za-z_0-9]*", text[:300])
    if not words:
        return text.strip()[:1] or "?"
    w = [x.upper() for x in words]
    if w[0] in ("CREATE", "ALTER", "DROP", "SHOW", "DESCRIBE", "DESC", "GRANT", "REVOKE",
                "COMMENT", "SET", "ALTER"):
        rest = [x for x in w[1:6] if x not in SKIP_WORDS and not (x == "ON" and w[0] == "COMMENT")]
        return " ".join([w[0]] + rest[:1])
    return w[0]


def cluster_key(sql: bytes, err) -> str:
    text = sql.decode(errors="replace")
    lead = lead_of(text)
    snippet = sql[err.start_byte:err.start_byte + 40].decode(errors="replace").strip()
    tok = re.match(r"[A-Za-z_][A-Za-z_0-9]*|\S{1,3}", snippet)
    near = tok.group(0).upper() if tok and tok.group(0)[0].isalpha() else (tok.group(0) if tok else "<end>")
    if err.is_missing:
        near = f"missing {err.type}"
    return f"{lead} … {near}"


def audit_dialect(dialect: str, adapters: list, show: int) -> dict:
    from tree_sitter import Parser
    parser = Parser(load_language(dialect))
    sources, clusters, examples = {}, Counter(), {}
    seen = set()
    for adapter in adapters:
        stmts = []
        for s in statements_for(adapter):
            norm = re.sub(r"\s+", " ", s).strip()
            if norm and norm not in seen:
                seen.add(norm)
                stmts.append(s)
        capped = None
        if len(stmts) > CAP:
            capped = len(stmts)
            stmts = sorted(stmts, key=lambda s: hashlib.sha1(s.encode()).hexdigest())[:CAP]
        ok = 0
        for s in stmts:
            b = s.encode()
            tree = parser.parse(b)
            if not tree.root_node.has_error:
                ok += 1
                continue
            err = first_error(tree.root_node)
            key = cluster_key(b, err) if err is not None else f"{lead_of(s)} … ?"
            clusters[key] += 1
            if key not in examples or len(s) < len(examples[key]):
                examples[key] = s
        rec = {"total": len(stmts), "parsed": ok,
               "rate": round(100.0 * ok / len(stmts), 1) if stmts else None}
        if capped:
            rec["sampled_from"] = capped
            print(f"[corpus]   {adapter}: sampled {CAP} of {capped} statements")
        sources[adapter] = rec
    total = sum(r["total"] for r in sources.values())
    parsed = sum(r["parsed"] for r in sources.values())
    top = [{"prefix": k, "count": c, "example": examples[k][:400]} for k, c in clusters.most_common(40)]
    res = {"sources": sources, "total": total, "parsed": parsed,
           "rate": round(100.0 * parsed / total, 1) if total else None, "clusters": top}
    line = ", ".join(f"{a} {r['parsed']}/{r['total']}" for a, r in sources.items())
    print(f"[corpus] {dialect:<12} {res['rate'] if res['rate'] is not None else '-':>5}%  ({line})")
    for c in top[:show]:
        print(f"    {c['count']:>5}  {c['prefix']}\n           e.g. {c['example'][:150]!r}")
    return res


def main() -> int:
    ap = argparse.ArgumentParser(description="Real-world SQL parse rate per dialect")
    ap.add_argument("--fetch", action="store_true", help="Clone the pinned sources")
    ap.add_argument("--dialect", help="Only this dialect")
    ap.add_argument("--show", type=int, default=0, help="Print the top N failure clusters")
    args = ap.parse_args()
    cfg = load_config()
    if args.fetch:
        fetch(cfg)
        return 0
    dialects = cfg["dialects"]
    if args.dialect:
        dialects = {args.dialect: dialects[args.dialect]}
    results = {}
    for d, adapters in dialects.items():
        if adapters:
            results[d] = audit_dialect(d, adapters, args.show)
    if args.dialect:
        return 0
    pins = {n: s["commit"] for n, s in cfg["sources"].items()}
    OUT.write_text(json.dumps({"sources": pins, "dialects": results}, indent=1, sort_keys=True) + "\n")
    print(f"\nWrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
