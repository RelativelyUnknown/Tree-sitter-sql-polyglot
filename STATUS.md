# Status: dialect documentation audit (handoff)

Last updated 2026-10-05. Branch `claude/jolly-cannon-ievvvk`, PR #9.

## What the task is

The question being answered: **is each dialect complete enough to be useful to a broad range of people,
measured against that engine's own documentation?**

Agreed scope:

- All 22 dialects plus the ANSI base, at full depth.
- The deliverable is an audit with tracked gaps. **No grammar fixes.**
- Everything lands in PR #9 on this branch. Don't open a new PR.

The full plan is in "Phases" below.

## Where it stands

| Phase | State |
|---|---|
| 0. Tooling: `tools/inventory.py`, `tools/corpus_audit.py`, `tools/grammar_outline.py`, schema in `tools/inventory/README.md` | Done |
| 1. Per-dialect inventories (agents write `tools/inventory/<dialect>.<part>.yml`) | **10 of 23 dialects done**; CockroachDB in progress |
| 2. Real-world corpora (`corpus_audit.py`) | Done |
| 3. Verify gap and suspect probes | Not started |
| 4. `docs/inventory.md` report, CI `--check` step, docs nav, AGENTS.md, PR description, summary | Not started |

### Recorded results

These come from `tools/inventory-results/<d>.json`, written by `tools/inventory.py --dialect <d>`.

- **Score** is weighted by tier.
- **Statements** counts statements whose probes all parse (full), some parse (partial) or none parse (absent).
- **Probe columns** split the probes by outcome:
  - **ok:** our parser accepts it.
  - **gap:** we reject it and at least one reference parser accepts it.
  - **unconfirmed:** we reject it and no reference parser accepts it.
  - **suspect:** we accept it and no reference parser does, so the grammar may be too loose.

| Dialect | Score | Statements full / partial / absent | Probes ok / gap / unconfirmed / suspect | Doc examples parsed |
|---|---|---|---|---|
| SQLite | 66.7% | 10 / 18 / 5 | 325 / 122 / 0 / 0 | 35/42 |
| BigQuery | 66.3% | 65 / 43 / 21 | 624 / 320 / 80 / 26 | 162/277 |
| DuckDB | 65.3% | 21 / 38 / 5 | 664 / 366 / 15 / 21 | 198/301 |
| MySQL | 51.0% | 55 / 79 / 58 | 745 / 666 / 44 / 31 | 195/373 |
| PostgreSQL | 49.7% | 49 / 64 / 70 | 922 / 886 / 0 / 0 | 133/222 |
| MariaDB | 43.2% | 33 / 86 / 93 (n/a 6) | 1269 / 790 / 181 / 27 | 173/305 |
| Databricks | 41.8% | 45 / 92 / 91 | 1064 / 773 / 453 / 79 | 268/517 |
| T-SQL | 40.4% | 93 / 100 / 253 (n/a 23) | 961 / 1155 / 258 / 41 | 286/519 |
| Oracle | 31.4% | 21 / 102 / 148 (n/a 1) | 506 / 560 / 874 / 183 | 122/341 |
| Snowflake | 20.8% | 64 / 103 / 618 | 1081 / 1334 / 1088 / 54 | 253/715 |

Reading notes:

- **Oracle and Snowflake** have many unconfirmed probes. No reference parser has a real grammar for
  them, so those need the Phase 3 check before anyone trusts them as gaps.
- **T-SQL `SET` probes** show up as suspect: our grammar accepts them and nothing else does. That
  points to a grammar that's too loose.
- **`ALTER FUNCTION ... RENAME TO / OWNER TO / SET SCHEMA`** fails in both Postgres and CockroachDB.
  This was checked by hand and is a real gap, not a tooling fault.

### Still to inventory (the chunk queue)

From `tools/inventory-work/queue2.json`: 206 tasks done, 345 queued.

| Dialect | Queued chunks |
|---|---|
| CockroachDB | 25 (s01, s02 and s03 are done; **s04 and s05 were stopped mid-run with nothing written, so they are back in the queue**) |
| Redshift | 27 |
| ClickHouse | 24 |
| Teradata | 42 |
| HANA | 31 (includes `hana.sqlscript`) |
| Db2 | 41 |
| Trino | 21 |
| Athena | 16 |
| Flink | 16 |
| Spanner | 13 |
| Hive | 38 |
| Spark | 33 |
| ANSI base | 18 |

Each of these has its index done, so the statement list is fixed. What's left is chunk agents
writing part files.

## How it works

### Inventory files and the runner

- **Inventory files:** `tools/inventory/<dialect>.<part>.yml`. Parts merge by dialect prefix. The schema,
  tiers, probe rules and statuses are in `tools/inventory/README.md`.
- **Runner:** `tools/inventory.py --dialect <d>` parses every probe with our dialect parser and
  with the reference parsers from `tools/coverage.py`: sqlglot, pglast, sqlfluff, and ANTLR for
  SQLite, MySQL and T-SQL. It classifies each probe and writes `tools/inventory-results/<d>.json`.
  - `--file <path>` runs a single part file and writes nothing; agents use this.
  - `--check` is the fast CI gate: our parser only.
  - `--report` writes `docs/inventory.md`.
- **`tools/grammar_outline.py <dialect> [rule-filter] [--tests]`** prints the resolved grammar as
  compact EBNF, so agents can see what we have without reading every grammar file.

### The chunk queue

The queue lives in `tools/inventory-work/`, moved there from the old session's scratchpad.

**Files:**

- `chunk.py`: the queue tool. It reads and writes `queue2.json` next to itself.
- `queue2.json`: one entry per task, with fields `task`, `kind`, `status`, `agent` and `prompt`.
- `inventory-queue.json`: the old queue. `chunk.py` still loads it, so keep it.
- `inventory-brief.md`: the brief for chunk agents.
- `index-brief.md`: the brief for index agents.
- `index/<dialect>.json`: each dialect's statement list (id, name, doc URL, tier).
- `td-doc.py`: a Teradata docs helper. Call it as `python3 tools/inventory-work/td-doc.py topic <mapId> <contentId>`.

**Commands:**

```bash
python3 tools/inventory-work/chunk.py status          # counts by status
python3 tools/inventory-work/chunk.py next 3          # next queued tasks, finishing one dialect before the next
python3 tools/inventory-work/chunk.py prompt <task>   # the prompt for an agent
python3 tools/inventory-work/chunk.py set <task> running|done|queued [agentId]
python3 tools/inventory-work/chunk.py split <dialect> # turn index/<d>.json into chunks (already done for all)
```

**How tasks are cut and sized:**

- **Chunk size:** an index agent lists a dialect's statements, then `split` packs them into chunks
  worth 6 points each, counting high = 3, medium = 0.6 and low = 0.15 points.
- **Expression chunks:** each dialect also gets three:
  - `expr_a`: literals, types and casts.
  - `expr_b`: operators, predicates and special-form functions.
  - `expr_c`: aggregates, windows, lambdas, JSON/array access and function families.
- **Agent output:** each chunk agent writes exactly one part file, `<d>.sNN.yml` or `<d>.expr_x.yml`.
  It runs `inventory.py --file` once and hands back a JSON line.

### Agent rules that keep cost down

These rules come from your cost feedback.

- **Model and concurrency:** agents run on **Sonnet**, at **most 3 at a time**. Each one costs
  roughly 65–150k tokens.
- **Prompt:** every agent gets the same one-line prompt:
  > Your task is in this file; read it and follow it exactly: run `python3 tools/inventory-work/chunk.py prompt <task>` and do what it prints.
- **Scope:** do only the assigned statements.
  - At most 3 doc examples per high or medium statement, none for low.
  - One check run, with no review round.
  - Fetch syntax blocks in batches with one script; never use full-page WebFetch.
- **Processes:** never kill processes you didn't start. Several agents run `inventory.py` in parallel.

### The dispatch loop

1. Run `chunk.py next N` to fill the 3 slots. Launch each agent in the background with model sonnet.
   Then run `chunk.py set <task> running <agentId>`.
2. When an agent hands back, run `chunk.py set <task> done`. Launch the next task, then make a
   checkpoint commit:
   ```bash
   git add -A tools/inventory/ && git commit -m "inventory: checkpoint chunk parts [skip ci] (...)" && git push -u origin claude/jolly-cannon-ievvvk
   ```
   Checkpoint commits carry **`[skip ci]`**. Back-to-back pushes otherwise cancel each other's CI
   runs and show up as false `ci-passed` failures.
3. When every chunk of a dialect is done, record it:
   ```bash
   TREE_SITTER_BIN=$PWD/node_modules/.bin/tree-sitter .venv-tools/bin/python tools/inventory.py --dialect <d> > /tmp/<d>-run.txt
   ```
   Redirect to a file. Piping into `head` once killed a run before it wrote results. A full run
   with sqlfluff takes several minutes. Then commit `tools/inventory-results/<d>.json` and the
   part files without `[skip ci]`.
4. **On a rate-limit 429:** an agent dies with "You've hit your session limit · resets HH:MM". Wait
   for the reset, then resume the same agent with SendMessage so it keeps its context. A new chat
   can't resume the old session's agents. It should check whether the part file exists, then
   requeue or keep the task.

## Setup in a fresh container

```bash
npm ci                                   # tree-sitter CLI in node_modules/.bin
node scripts/inflate-parsers.js          # parser.c / node-types.json from the committed .br blobs
for d in */grammar.js; do (cd "$(dirname $d)" && ../node_modules/.bin/tree-sitter generate --no-parser); done
                                         # src/grammar.json for grammar_outline.py (gitignored)
python3 -m venv .venv-tools && .venv-tools/bin/pip install -r tools/requirements.txt
bash tools/antlr/setup.sh                # ANTLR reference parsers for sqlite/mysql/tsql
```

Before launching agents, smoke test with
`.venv-tools/bin/python tools/inventory.py --file tools/inventory/sqlite.core.yml`.

**HANA:** the SAP HANA PDFs you supplied and their `pdftotext` conversions are committed in
`tools/inventory-work/hana-docs/`. The HANA chunk prompts point to the `.txt` files.

## Phases still to do after the queue

1. **Phase 3, verification (cheap).** For each finished dialect, an agent re-reads the cited doc for
   the gap, unconfirmed and suspect probes. It confirms each probe as real syntax, or fixes or drops
   it, and spot-checks about 10% of the `not-applicable` entries. Start with Oracle, Snowflake
   (unconfirmed) and T-SQL (`SET` suspects).
2. **Phase 4, report and wiring.**
   - Run `inventory.py --report` to write `docs/inventory.md`, and generate it in
     `.github/workflows/pages.yml` the same way `coverage.md` is.
   - Add a nav entry to `docs/.vitepress/config.mjs`.
   - Add an `inventory.py --check` step to `.github/workflows/ci.yml`.
   - Add an AGENTS.md section on maintaining the inventory.
   - Update the PR #9 description.
   - Post a chat summary of headline numbers and top gaps per dialect.
   - Delete `STATUS.md` and `tools/inventory-work/` before merging, unless you want to keep the queue.

## Conventions

Commit messages end with:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019GvSkc1GUg7Y2qd1n9MSeN
```

No other model identifiers go in repo files.
