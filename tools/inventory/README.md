# Statement inventory

One inventory per dialect, built from that engine's own documentation: every statement in the
vendor's statement index, with one probe per documented clause or form, plus expression-level
syntax and verbatim doc examples. `tools/inventory.py` parses all of it with our grammar and with
the reference parsers from `tools/coverage.py`, and `docs/inventory.md` reports the result.

The goal is to measure what's missing, so probes follow the vendor's syntax, never what our grammar
happens to accept.

## Files

`tools/inventory/<dialect>.yml`, optionally split into parts named `<dialect>.<part>.yml`
(for example `snowflake.core.yml` and `snowflake.create.yml`). Parts are merged; a statement or
expression id may appear in only one of them. Every part repeats the header.

```yaml
dialect: postgres                     # must match the file name prefix
engine: PostgreSQL
version: "17"                         # the documentation version you read
source: https://www.postgresql.org/docs/17/sql-commands.html   # the statement index

statements:
  - id: alter_table                   # snake_case, unique within the dialect
    name: ALTER TABLE                 # as the vendor writes it
    doc: https://www.postgresql.org/docs/17/sql-altertable.html  # the page you read
    tier: high                        # high | medium | low (below)
    probes:
      - id: add_column                # snake_case, unique within the statement
        sql: "ALTER TABLE t ADD COLUMN c integer;"
      - id: alter_column_type
        sql: "ALTER TABLE t ALTER COLUMN c TYPE bigint USING c::bigint;"
        note: optional; why this probe looks the way it does
    examples:                         # verbatim from the doc page's examples, each ending in ;
      - "ALTER TABLE distributors ADD COLUMN address varchar(30);"

  - id: load
    name: LOAD
    doc: https://www.postgresql.org/docs/17/sql-load.html
    tier: low
    status: not-sql                   # only with a reason, see below
    reason: Loads a shared library into the session; ...

expressions:                          # same shape as statements
  - id: json_operators
    name: JSON operators
    doc: https://www.postgresql.org/docs/17/functions-json.html
    tier: high
    probes:
      - { id: arrow, sql: "SELECT j -> 'a', j ->> 'a', j #> '{a,b}' FROM t;" }
```

## Tiers

- **high:** what most users write every day. Queries and every clause of `SELECT`, `INSERT`,
  `UPDATE`, `DELETE`, `MERGE`/upsert, `CREATE`/`ALTER`/`DROP TABLE`, views, indexes, functions and
  procedures, transactions, and the expression syntax used in them.
- **medium:** routine work for application developers, analysts and ordinary admins: schemas and
  databases, sequences, grants and roles, `EXPLAIN`, `SHOW`/`DESCRIBE`, session settings, loading
  and unloading data, triggers, common maintenance.
- **low:** DBA-only, cluster administration, replication, rarely used or legacy statements.

## Probes

- Minimal and self-contained: placeholder names (`t`, `c`, `s`, `f`, `v`, `idx`), literal values,
  one statement, ending in `;`.
- Taken from the syntax block on the cited page. Valid SQL for that engine and version is the only
  bar. Never shape a probe around what our grammar accepts.
- One probe per documented clause, option or form, so a statement that only parses in its basic form
  shows up as partial:
  - **high:** every optional clause and form in the syntax block (a `CREATE TABLE` typically needs
    15 to 40 probes, a `SELECT` 30 or more: each join kind, set operation, grouping form, window
    frame form, locking clause, sampling clause, and so on).
  - **medium:** the main forms, typically 2 to 6.
  - **low:** the basic form, typically 1 or 2.
- Combine options only when the syntax requires them together.
- In YAML, double-quote the SQL or use a `|-` block for anything with `:`, `#`, quotes or
  newlines. Run `--validate` to catch quoting mistakes.

## Expressions

The `expressions` section covers syntax that isn't a statement: literals (numbers, strings and
their prefixes and escapes, dates and intervals, arrays, maps, structs, JSON), every operator
family, type names and parameterized types, casts, `CASE`, special-form functions with keywords
inside the parentheses (`EXTRACT(... FROM ...)`, `SUBSTRING(... FROM ... FOR ...)`,
`TRIM(LEADING ... FROM ...)`, `POSITION`, `OVERLAY`, `CAST ... FORMAT`), aggregate syntax
(`FILTER`, `WITHIN GROUP`, ordered aggregates), window syntax, subquery predicates, lambdas,
identifier quoting, comments, parameters and variables. Ordinary `name(args)` function calls
don't need a probe each; one probe per family is enough.

## Status

Everything in the vendor's statement index gets an entry. Only two statuses exclude one from the
score, each needs a `reason`, and both are rare:

- `not-sql`: listed in the index but not something a SQL parser sees: client or shell commands
  (`DELIMITER`, `!set`), embedded-SQL host constructs, statements valid only inside a
  host-language precompiler.
- `not-applicable`: documented but unusable in this edition, such as a statement the page says is
  removed, or one restricted to a different product the index shares a page with. Cite the
  sentence.

A statement our grammar lacks is a gap, not `not-applicable`.

## Running

```bash
python tools/inventory.py --validate                         # schema only
python tools/inventory.py --file tools/inventory/postgres.yml # one file; writes no results
python tools/inventory.py --dialect postgres                 # one dialect; writes its results
python tools/inventory.py                                    # everything
python tools/inventory.py --check                            # CI: fail if a probe stopped parsing
python tools/inventory.py --report                           # docs/inventory.md
```

Each probe is reported as one of:

- **implemented:** our grammar parses it.
- **gap:** our grammar rejects it, and a reference parser accepts it (or none knows the dialect).
- **unconfirmed:** our grammar rejects it and so does every reference parser. Either a gap the
  references also miss, or a probe that isn't valid SQL. Re-read the doc before keeping it, and add
  a `note` pointing at the syntax it comes from.
- **suspect:** our grammar accepts it and every reference parser rejects it. Usually a reference
  parser's blind spot; occasionally an invalid probe. Check it the same way.

The reference parsers' coverage is uneven (pglast is the real PostgreSQL parser; SQLGlot and
sqlfluff are approximations; ANTLR only covers SQLite, MySQL and T-SQL here), so their verdict
is a prompt to look again, not a ruling.
