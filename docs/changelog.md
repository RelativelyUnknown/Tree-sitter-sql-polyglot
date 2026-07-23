# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### Features

- **T-SQL:** `IDENTITY[(seed, increment)]` column property; computed columns `col AS (expr) [PERSISTED]`
- **T-SQL:** `CREATE TYPE … AS TABLE (…)` (table-valued) and `CREATE TYPE … FROM base_type` (alias)
- **BigQuery:** `PIVOT` / `UNPIVOT`
- **MySQL:** `STRAIGHT_JOIN` join type; `ALTER TABLE … ALGORITHM=`/`LOCK=` online-DDL options
- **MySQL:** multi-table `DELETE` (`DELETE t1, t2 FROM …` and `DELETE FROM t1, t2 USING …`)
- **Spark / Databricks / BigQuery / Snowflake:** `GROUP BY ALL`
- **PostgreSQL:** `CREATE DOMAIN`
- **PostgreSQL:** foreign-data DDL: `CREATE SERVER`, `CREATE FOREIGN TABLE` (with `OPTIONS`)
- **SQLite:** `GLOB` and `MATCH` pattern operators
- **DuckDB:** `UNION`/`EXCEPT`/`INTERSECT … BY NAME`
- **Teradata:** character-column attributes `[NOT] CASESPECIFIC`, `UPPERCASE`, `TITLE`
- **SAP HANA:** `SELECT TOP n`; `ALTER TABLE … ADD (col type, …)` parenthesized column list
- **MariaDB:** `CREATE OR REPLACE TABLE`
- **Redshift:** `ALTER TABLE … APPEND FROM`
- **Hive:** `ALTER TABLE … [PARTITION (…)] CONCATENATE`
- **CockroachDB:** `ALTER TABLE … SPLIT AT`/`UNSPLIT AT`/`SCATTER` range administration
- **Trino:** `CREATE VIEW … SECURITY {DEFINER|INVOKER}` (and optional `COMMENT`)
- **Db2:** `LABEL ON {TABLE|COLUMN} … IS '…'`
- **Spanner:** generated columns `col AS (expr) STORED`; `CREATE VIEW … SQL SECURITY {INVOKER|DEFINER}`
- **Flink:** `LATERAL TABLE(func(…)) AS t(cols)` table-function join
- **Athena:** `VACUUM`; `ALTER TABLE … ADD/DROP PARTITION`, `SET LOCATION`
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
- **All dialects:** `COMMENT ON` wired into the base DDL dispatch and every dialect override — previously unreachable in 14 dialects (#126)
- **Trino/Athena:** `SELECT … FOR UPDATE` (#113)
- **Snowflake:** `RETURNING` on INSERT/UPDATE/DELETE (#116)
- **BigQuery:** `THEN RETURN` on INSERT/UPDATE/DELETE (#117)
- **DuckDB:** `RETURNING` on INSERT/UPDATE/DELETE (#118)
- **ClickHouse:** `INSERT … RETURNING` (#119)
- **Db2:** `SELECT … FROM FINAL/NEW/OLD TABLE (dml)` data-change-table-reference (#123)
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
