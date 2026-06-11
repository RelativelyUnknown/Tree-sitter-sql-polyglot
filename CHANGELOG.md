# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### Features

- **Base (ANSI):** `SAVEPOINT` / `RELEASE SAVEPOINT` / `ROLLBACK TO SAVEPOINT`; `START TRANSACTION` with `ISOLATION LEVEL` and `READ ONLY`/`READ WRITE` modes; `BEGIN`/`COMMIT`/`ROLLBACK WORK` (#86)
- **PostgreSQL:** `FOR UPDATE`/`SHARE` locking clause with `NOWAIT`/`SKIP LOCKED`; `LOCK TABLE … IN … MODE` (#86); `GRANT … ON ALL TABLES/SEQUENCES/FUNCTIONS IN SCHEMA` (#87); `SELECT DISTINCT ON (…)` (#88); `ILIKE`/`NOT ILIKE` operators (#89); `PREPARE`/`EXECUTE`/`DEALLOCATE` (#90); `DELETE … USING` and `CALL` (#91); `EXPLAIN ( option … )` (#92)
- **Redshift:** `GRANT … ON ALL TABLES/FUNCTIONS/PROCEDURES IN SCHEMA` (#87)
- **Snowflake:** `CALL`; `INSERT OVERWRITE INTO`; `CREATE EXTERNAL TABLE`; `ALTER TABLE … CLUSTER BY` / `DROP CLUSTERING KEY` (#94)
- **BigQuery:** scripting `CALL`, `RAISE [USING MESSAGE = …]`, `RETURN` (#95)
- **Hive:** `SELECT TRANSFORM(…) USING 'script' AS (…)` (#96); `SHOW PARTITIONS/TABLES/DATABASES/FUNCTIONS`, `DESCRIBE [FORMATTED|EXTENDED]`, `ALTER TABLE … EXCHANGE PARTITION` (#97)
- **ClickHouse:** `BACKUP` / `RESTORE` (#98)
- **Db2:** cursor lifecycle (`DECLARE … CURSOR [WITH HOLD] FOR`, `OPEN`, `FETCH … INTO`, `CLOSE`) and `FOR … AS … DO … END FOR` loop (#99)
- **MySQL:** `FOR UPDATE/SHARE … [NOWAIT|SKIP LOCKED]` and `LOCK IN SHARE MODE` (#101); `SET GLOBAL/SESSION/PERSIST[_ONLY]`, `SET NAMES`, `SET CHARACTER SET` (#102); `CREATE/ALTER/DROP/RENAME USER` with `'user'@'host'` accounts (#106); `REPAIR/CHECK/ANALYZE TABLE` incl. histogram management (#107)
- **Oracle:** `FOR UPDATE [OF …] [NOWAIT|WAIT n|SKIP LOCKED]` (#101); `ANALYZE TABLE/INDEX` (#107); `MODEL` clause (#108); `ALTER SYSTEM`/`ALTER SESSION`, `CREATE/DROP DIRECTORY`, `GRANT READ/WRITE ON DIRECTORY` (#111)
- **T-SQL:** `USE database` (#103); `CREATE/DROP SYNONYM` (#105); `CREATE/ALTER/DROP LOGIN` and `USER` security DDL (#106)
- **Snowflake:** `USE DATABASE/SCHEMA/WAREHOUSE/ROLE` (#104)
- **Redshift:** multi-name `DROP USER`; full user-management corpus coverage (#109)
- **ClickHouse:** `EXCHANGE TABLES … AND …`; `ALTER TABLE FREEZE/UNFREEZE [PARTITION …] [WITH NAME …]` (#110)
- **Base (ANSI):** `GRANT`/`REVOKE` (DCL); `GROUP BY ROLLUP`/`CUBE`/`GROUPING SETS` and `WITH ROLLUP`/`CUBE`; `FETCH {FIRST|NEXT} n {ROW|ROWS} {ONLY|WITH TIES}`; `WITHIN GROUP (ORDER BY …)` ordered-set aggregates; ANSI `TRIM([{BOTH|LEADING|TRAILING} [char] FROM] str)`; interval qualifiers (`INTERVAL '1' DAY`)
- **Spark:** `QUALIFY`; `PIVOT`/`UNPIVOT`; query-level `CLUSTER`/`DISTRIBUTE`/`SORT BY`; `CREATE TABLE … USING/OPTIONS`
- **Hive:** `LOAD DATA [LOCAL] INPATH`; `INSERT OVERWRITE [LOCAL] DIRECTORY`; multi-table `INSERT`; `CLUSTER`/`DISTRIBUTE`/`SORT BY`
- **SQLite:** `INSERT OR REPLACE|IGNORE|…` and UPSERT; `AUTOINCREMENT`; `INDEXED BY`/`NOT INDEXED`
- **MySQL:** `SHOW`; `DESCRIBE`/`DESC`; `LIMIT offset, count`; `@`/`@@` user and session variables
- **BigQuery:** native types (`INT64`, `FLOAT64`, `BYTES`, `STRUCT<…>`, `ARRAY<…>`, …); `UNNEST`; backtick identifiers; `QUALIFY`
- **Snowflake:** `::` cast; `@stage` as a `FROM` source
- **T-SQL:** `CROSS`/`OUTER APPLY`; `PIVOT`/`UNPIVOT`; `#temp`/`##global` identifiers
- **PostgreSQL:** `PARTITION BY`; `PARTITION OF … FOR VALUES`; `CREATE TABLE (LIKE …)`; `INHERITS`
- **Oracle:** PL/SQL procedural bodies — assignment, `IF`/`ELSIF`, `WHILE`, bare `LOOP` + `EXIT [WHEN]`, numeric `FOR … IN 1..10`, `RETURN`, `CONTINUE`, `NULL`; `FORALL` over UPDATE/DELETE/MERGE; `BULK COLLECT INTO`
- **Db2:** SQL PL procedural bodies — `BEGIN…END`, `DECLARE`, `SET`, `IF`/`ELSEIF`, `WHILE…DO`, `LOOP`, `LEAVE`, `ITERATE`

### Bug Fixes

- **MariaDB:** restore MySQL features dropped by the `_column_constraint` override (`AUTO_INCREMENT`, `STORED`/`VIRTUAL` generated columns, FK `ON DELETE/UPDATE` actions)
- **Databricks:** restore `iceberg_write_order` and `DISTRIBUTED BY PARTITION` dropped by the `_alter_specifications` override
- **Base:** fix `_decimal_number` consuming the first dot of Oracle's `..` range operator

### Chores

- Remove duplicate `keyword_except`, `keyword_rows`, `keyword_extension` definitions in `grammar/keywords.js`
- Documentation refresh: full 12-dialect coverage in `README.md`, `AGENTS.md`, and `CONTRIBUTING.md`

## [0.3.11](https://github.com/redpandamc/tree-sitter-sql-extended/releases/tag/v0.3.11) (2026-05-23)

### Features

- Multi-dialect grammar architecture: clean ANSI SQL base with independently compiled dialect extensions for Spark/Hive, Databricks/Unity Catalog, PostgreSQL, and MySQL
- Hash-based grammar caching (`scripts/generate.js`) — skips `tree-sitter generate` when sources are unchanged
- Per-dialect test corpora in `<dialect>/test/corpus/`
- `scripts/bump-version.sh`: single command to sync version across all 5 manifests
- `agents.md`: architecture guide for grammar composition and dialect extension
