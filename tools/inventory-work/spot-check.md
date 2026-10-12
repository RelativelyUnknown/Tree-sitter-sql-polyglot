# Task: spot-check `not-applicable` / `not-sql` inventory entries against vendor docs

Repo: `/home/user/Tree-sitter-sql-polyglot`. Some statements in `tools/inventory/<dialect>.<part>.yml` are marked
`status: not-applicable` or `not-sql` with a `reason`. They score nothing, so a wrong mark hides a real gap.
Decide, from the vendor documentation, whether each mark below is justified. You are not judging our grammar.

Rules: never kill processes you did not start; edit nothing except writing `tools/inventory-verify/spot-check.json`;
no git commands that change anything; scratch under `tools/inventory-work/scratch/spot-check/`. Fetch with `curl`
(prefer it to WebFetch), print only the relevant lines, cap output at a few thousand characters. Save the verdict
file after each item (a usage limit can cut you off); if it exists, resume and skip finished items.

Items (dialect / part file / entry id: what to check):

1. spanner / `tools/inventory/spanner.expr_c.yml` / expression `c_window_syntax`: marked "no OVER/WINDOW syntax in Spanner". Spanner GoogleSQL does have analytic (window) functions: check https://cloud.google.com/spanner/docs/reference/standard-sql/window-function-calls and the query-syntax WINDOW clause.
2. hive / `tools/inventory/hive.s26.yml` / `drop_index` and `alter_index`: marked removed in Hive 3.0 (HIVE-18448). Confirm for Hive 4.x.
3. clickhouse / find the part file with `grep -l "id: create_index" tools/inventory/clickhouse.*.yml` / `create_index`: marked n/a because the cited page is only the CREATE overview. ClickHouse has `CREATE INDEX` for data skipping indexes (ALTER TABLE ... ADD INDEX and CREATE INDEX). Check https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index and the statements/create docs.
4. clickhouse / `pipe_syntax_query`: marked n/a (404, no `|>`). Check whether ClickHouse documents pipe syntax in 2026 docs.
5. redshift / `set_session_characteristics`: marked deprecated with no syntax block. Check the Redshift docs for SET SESSION CHARACTERISTICS.
6. snowflake / `truncate_materialized_view`: marked no longer supported. Confirm in the Snowflake docs.
7. oracle / `audit_traditional`: marked desupported in 23. Confirm the 26ai SQL reference still documents the syntax or not.
8. tsql / `qualify`, `from_select`: marked Fabric-only. Confirm against the SELECT docs (Learn pages for QUALIFY and the Fabric SELECT notes).
9. tsql / `explain`, `rename`: marked Azure Synapse / PDW only. Confirm.
10. db2 / `include`: marked embedded-SQL precompiler construct (not-sql). Confirm in the Db2 12.1 docs (INCLUDE statement).
11. teradata / `connect`: marked embedded SQL only (not-sql). Confirm.
12. mariadb / `alter_logfile_group`: marked NDB-only, not supported by MariaDB. Confirm.

For each item give one verdict:
- `justified`: the doc supports the mark.
- `wrong`: the statement exists for that engine/edition in scope (say what the doc shows and cite the URL).
- `unclear`: could not be decided (say why).

Write `tools/inventory-verify/spot-check.json`:
`{"verdicts": {"<dialect>/<id>": {"verdict": "justified|wrong|unclear", "note": "<one short line>", "url": "<page read>"}}}`

Return only: `{"justified": 0, "wrong": 0, "unclear": 0, "wrong_ids": []}`
