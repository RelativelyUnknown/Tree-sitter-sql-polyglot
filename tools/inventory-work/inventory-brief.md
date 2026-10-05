# Brief: build one part of a dialect's statement inventory

You're building one file of the per-dialect SQL statement inventory in the tree-sitter-sql-polyglot
repo at `/home/user/Tree-sitter-sql-polyglot`. The goal is an honest measure of how much of the
engine's documented SQL our tree-sitter grammar can parse, so the inventory must reflect the vendor
documentation, not our grammar.

First read `tools/inventory/README.md` in the repo. It defines the file format, tiers, probe depth,
expressions section and statuses. Follow it exactly.

## Rules

- Never kill processes you did not start (no `pkill`/`killall`): other agents run `inventory.py` in parallel.
- Write exactly one file, the one named in your assignment, under `tools/inventory/`. Don't create
  or edit any other file in the repo: no grammar files, no other inventory files, no
  `tools/inventory-results/` results, and no git commands that change anything. Scratch files go
  under `tools/inventory-work/scratch/<your file stem>/`.
- Your assignment lists the exact statements (with doc URL and tier) you cover. Do only those,
  each with the URL of the page you actually read as `doc`. Don't add other statements; other
  agents own them. Keep the given ids.
- Probes come from the syntax block on the cited page and must be valid for that engine and
  version. Never change a probe to make our grammar accept it.
- Copy doc examples verbatim into `examples:` (at most 3 per high or medium statement, none for
  low; each a
  complete statement ending in `;`; skip examples that use client-side substitution variables or
  placeholders the engine itself wouldn't accept).

## Save as you go

Your session can be cut off by a usage limit at any time, so never hold the inventory in your head
until the end:

- Create your file with its header first.
- Append each statement entry as soon as its probes and examples are written, for example with a
  short `cat >> file <<'EOF'` per entry, or an Edit.
- If your file already exists when you start, you're resuming an interrupted run. Read it, keep
  what's there, and continue with the statements it doesn't have yet.

Keep reads small, too. Never print a whole page. Extract just the Syntax block and the Examples
section (`grep -n`, then `sed -n` on that range), and cap any output at a few thousand characters.
Run `inventory.py --file` (below) once when your file is complete. Fix YAML errors and obvious
probe typos, then stop: don't do a second full review round.

## Medium and low tier: batch the fetching

Medium statements need their main forms (2 to 6 probes); low-tier statements only the basic form
(1 or 2 probes, no examples). Don't fetch them one by one: write one small script that loops over all your medium and low-tier URLs and prints only each
page's Syntax block (at most ~1500 characters for medium, ~400 for low), run it once, and write
their entries from that output.

## Fetching docs

Many pages are needed, so prefer `curl` over WebFetch:

```bash
curl -sL --max-time 30 "$URL" | python3 -c 'import sys,html,re; t=sys.stdin.read(); t=re.sub(r"(?is)<(script|style).*?</\1>","",t); t=re.sub(r"<[^>]+>"," ",t); print(re.sub(r"\s+"," ",html.unescape(t)))' | head -c 20000
```

Grep that text for the "Syntax" section. Use WebFetch when curl output is unusable. If a vendor
portal is a JavaScript app with no content in the HTML, look for its content API, the same docs as
markdown in the vendor's public GitHub docs repository (fetch via `raw.githubusercontent.com`, or
`git clone --depth 1 --filter=blob:none --sparse` into your scratch dir; the github.com web pages
and API are blocked here), or official PDFs. Keep `doc:` pointing at the canonical vendor page.

## Checking your file

```bash
cd /home/user/Tree-sitter-sql-polyglot
PY=.venv-tools/bin/python
export TREE_SITTER_BIN=$PWD/node_modules/.bin/tree-sitter
$PY tools/inventory.py --file tools/inventory/<your file> --validate   # schema and YAML only
$PY tools/inventory.py --file tools/inventory/<your file>              # parse with ours + reference parsers
```

The second command prints a summary line and every probe that isn't `implemented`. For
`unconfirmed` (nobody parses it) and `suspect` (only ours parses it) probes, fix any that are
plainly wrong against the syntax block you already extracted; otherwise leave them (a verifier
reviews them later). Don't re-fetch pages for this. Plain `gap` lines are expected.

## What to return

Your final message is consumed by a program. Return only this JSON, nothing else:

```json
{"file": "tools/inventory/<name>.yml", "statements": 0, "probes": 0, "examples": 0,
 "result_line": "<the [inventory] summary line>", "unreachable": []}
```

## Core statement list (used only by older assignments) (shared by every dialect's scope split)

When your assignment says "core", it means: queries (`SELECT`, `WITH`, `VALUES`, set operations
and every query clause: joins, grouping, windows, ordering and limits, pivots, sampling, table
functions), `INSERT`, `UPDATE`, `DELETE`, `MERGE` and upsert or `REPLACE` forms, `TRUNCATE`,
`CREATE`/`ALTER`/`DROP` for `TABLE` (including `CREATE TABLE AS`), `VIEW` (including materialized),
`INDEX`, `FUNCTION`, `PROCEDURE`, `SCHEMA` and `DATABASE`, transaction control (`BEGIN`/`START`,
`COMMIT`, `ROLLBACK`, `SAVEPOINT`, `SET TRANSACTION`), `GRANT`/`REVOKE`, `EXPLAIN`, and the
dialect's procedural language where the engine parses it as SQL (blocks, variable declarations,
assignment, `IF`/`CASE`, loops, exception handling, cursors). Plus the whole `expressions`
section.

When your assignment says "rest", it means every statement in the vendor's index that isn't in the
core list. Another agent owns the other side of the split, so don't add their statements.
