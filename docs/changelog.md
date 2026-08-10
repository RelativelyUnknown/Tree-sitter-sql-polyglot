# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

0.3.11 shipped an ANSI base with four dialects on top. There are now 22, the base grammar is
strictly ISO SQL, and coverage is measured against outside parsers rather than against our own test
suite.

### Breaking changes

- **Base grammar is ANSI only.** `LIMIT` and `LIMIT ... OFFSET`, `CREATE INDEX`,
  `CREATE MATERIALIZED VIEW`, `EXPLAIN`, `SELECT DISTINCT ON`, trailing
  `GROUP BY ... WITH ROLLUP`/`WITH CUBE`, PL/SQL declarations and block/`WHILE` statements no longer
  parse in the base grammar, which keeps the ANSI `OFFSET ... FETCH` form instead. Every dialect
  that really has the syntax re-adds it in its own override, so no dialect lost a feature.
- **Node names lost their dialect prefixes.** `bq_`, `db2_`, `plsql_`, `pg_`, `sf_`, `tsql_`,
  `iceberg_`, `oracle_`, `mysql_` and `flink_` prefixes are gone; the nodes now use the plain
  cross-dialect names (`optimizer_hint`, `table_partition_by`, `with_properties`, and so on).
  Queries and tools written against the old names need updating.
- **Dialect grammars were tightened to match their real engines.** Constructs a dialect inherited but
  never actually supported now fail to parse: `LIMIT` in Oracle and Db2, `OFFSET ... FETCH` in MySQL
  and BigQuery, materialized views in Spark, MySQL, SQLite and T-SQL, savepoints in ClickHouse and
  Trino, `QUALIFY` in Trino and Athena.

### Dialects

17 dialects joined the existing Spark/Hive, Databricks, PostgreSQL and MySQL grammars:

| Dialect | Extends | Dialect | Extends |
|---|---|---|---|
| snowflake | base | clickhouse | base |
| bigquery | base | flink | base |
| sqlite | base | redshift | base |
| oracle | base | trino | base |
| db2 | base | athena | trino |
| tsql | base | mariadb | mysql |
| duckdb | base | cockroachdb | postgres |
| teradata | base | spanner | bigquery |
| hana | base | | |

Hive was also split out of the combined Spark/Hive grammar into its own dialect extending the base
directly, giving the chain `databricks -> spark -> hive -> base` and bringing the total to 22.

### Features

- **Base (ANSI):** `GRANT`/`REVOKE`; `GROUP BY ROLLUP`/`CUBE`/`GROUPING SETS`;
  `FETCH {FIRST|NEXT} n {ROW|ROWS} {ONLY|WITH TIES}`; `WITHIN GROUP (ORDER BY ...)`;
  `TRIM([{BOTH|LEADING|TRAILING} [char] FROM] str)`; interval qualifiers (`INTERVAL '1' DAY`);
  `SAVEPOINT`/`RELEASE SAVEPOINT`/`ROLLBACK TO SAVEPOINT`; `START TRANSACTION` with
  `ISOLATION LEVEL` and `READ ONLY`/`READ WRITE`; `BEGIN`/`COMMIT`/`ROLLBACK WORK`; typed temporal
  literals (`DATE '...'`, `TIME '...'`, `TIMESTAMP '...'`); datetime value functions
  (`CURRENT_DATE`, `CURRENT_TIME`, `CURRENT_TIMESTAMP`, `LOCALTIME`, `LOCALTIMESTAMP`);
  `LIKE ... ESCAPE '...'`; `DECLARE ... CURSOR` with `OPEN`/`FETCH`/`CLOSE`; named
  `CONSTRAINT fk FOREIGN KEY (...) REFERENCES ...` table constraints.
- **`COMMENT ON`** is wired into the base DDL dispatch and every dialect override. It was previously
  unreachable in 14 dialects.
- **PostgreSQL:** `CREATE DOMAIN`, `CREATE CAST`, `CREATE AGGREGATE`, `CREATE SERVER` and
  `CREATE FOREIGN TABLE`; `PUBLICATION`/`SUBSCRIPTION`; `DO` blocks; identity columns; recursive
  `SEARCH`/`CYCLE`; `LISTEN`/`NOTIFY`/`UNLISTEN`; `FOR UPDATE`/`SHARE` with `NOWAIT`/`SKIP LOCKED`
  and `LOCK TABLE ... IN ... MODE`; `GRANT ... ON ALL TABLES/SEQUENCES/FUNCTIONS IN SCHEMA`;
  `SELECT DISTINCT ON (...)`; `ILIKE`; `PREPARE`/`EXECUTE`/`DEALLOCATE`; `DELETE ... USING`; `CALL`;
  `EXPLAIN ( option ... )`; table partitioning, `PARTITION OF ... FOR VALUES`,
  `CREATE TABLE (LIKE ...)` and `INHERITS`; complete `VACUUM`, `ALTER INDEX` and
  `ALTER MATERIALIZED VIEW`.
- **MySQL:** `SHOW`, `DESCRIBE`/`DESC`, `LIMIT offset, count`, `@`/`@@` variables; stored procedure
  and trigger bodies; cursors, `DECLARE HANDLER`/`CONDITION` and procedural `CASE`; partitioning DDL
  and `ALTER TABLE` partition management; `FOR UPDATE`/`SHARE` with `NOWAIT`/`SKIP LOCKED` and
  `LOCK IN SHARE MODE`; `SET GLOBAL`/`SESSION`/`PERSIST[_ONLY]`, `SET NAMES`, `SET CHARACTER SET`;
  `CREATE`/`ALTER`/`DROP`/`RENAME USER` with `'user'@'host'` accounts; `REPAIR`/`CHECK`/
  `ANALYZE TABLE` including histograms; `STRAIGHT_JOIN`; `ALTER TABLE ... ALGORITHM=`/`LOCK=`;
  multi-table `DELETE`; `MATCH (...) AGAINST (...)`; `SELECT ... INTO OUTFILE`/`DUMPFILE`;
  `GROUP BY ... WITH ROLLUP`; complete `ALTER VIEW`, `DROP INDEX` and `LOAD DATA`.
- **MariaDB:** split from MySQL with temporal tables, system versioning, `RETURNING`, `PACKAGE` and
  `CREATE OR REPLACE TABLE`.
- **Oracle:** PL/SQL bodies (assignment, `IF`/`ELSIF`, `WHILE`, `LOOP` with `EXIT [WHEN]`, numeric
  `FOR ... IN 1..10`, `RETURN`, `CONTINUE`, `NULL`), `FORALL`, `BULK COLLECT INTO`, `RETURNING INTO`,
  `PRAGMA` and `PIPE ROW`; cursors; `CREATE TRIGGER` with a PL/SQL block body; Oracle scalar types
  and optimizer hints; partitioning DDL and `DATE` literals; `FLASHBACK AS OF`, `CREATE SYNONYM`,
  `CREATE DATABASE LINK`; `FOR UPDATE [OF ...] [NOWAIT|WAIT n|SKIP LOCKED]`; `ANALYZE TABLE`/`INDEX`;
  the `MODEL` clause; `ALTER SYSTEM`/`ALTER SESSION`, `CREATE`/`DROP DIRECTORY`,
  `GRANT READ/WRITE ON DIRECTORY`; `PIVOT`/`UNPIVOT`; `MATCH_RECOGNIZE`;
  `fn(...) KEEP (DENSE_RANK {FIRST|LAST} ORDER BY ...)`; `ORGANIZATION {HEAP|INDEX|EXTERNAL}`;
  `JSON_TABLE(...)` and `XMLTABLE(...)`; materialized view logs, zonemaps and index rebuild.
- **Db2:** SQL PL bodies (`BEGIN...END`, `DECLARE`, `SET`, `IF`/`ELSEIF`, `WHILE...DO`, `LOOP`,
  `LEAVE`, `ITERATE`); cursors and the `FOR ... AS ... DO ... END FOR` loop;
  `SELECT ... FROM FINAL/NEW/OLD TABLE (dml)`; `LABEL ON {TABLE|COLUMN}`; temporal queries
  `FOR {SYSTEM_TIME|BUSINESS_TIME}`; `DECLARE GLOBAL TEMPORARY TABLE`;
  `CREATE TABLE ... ORGANIZE BY {ROW|COLUMN|DIMENSIONS (...)}` for column-organized and
  multidimensional clustering tables; `AUDIT`, `WHENEVER`, `GOTO`, `ALLOCATE CURSOR`,
  `ASSOCIATE LOCATORS`; `SET SCHEMA` and the special registers it accepts.
- **T-SQL:** scripting, `CROSS`/`OUTER APPLY`, `PIVOT`/`UNPIVOT`, `#temp`/`##global` identifiers;
  cursors; `EXEC`/`EXECUTE`, `RETURN`, `OPTION()` hints, `WAITFOR`; `USE database`;
  `CREATE`/`DROP SYNONYM`; `LOGIN` and `USER` security DDL; `IDENTITY[(seed, increment)]` and
  computed columns `col AS (expr) [PERSISTED]`; `CREATE TYPE ... AS TABLE (...)` and
  `CREATE TYPE ... FROM base_type`; select-list variable assignment (`SELECT @v = expr`);
  `CREATE`/`ALTER DATABASE` file specs and option lists; `GROUP BY ... WITH ROLLUP`/`WITH CUBE`.
- **BigQuery:** native types (`INT64`, `FLOAT64`, `BYTES`, `STRUCT<...>`, `ARRAY<...>`), `UNNEST`,
  backtick identifiers, `QUALIFY`; `PARTITION BY`/`CLUSTER BY` DDL; `CALL`,
  `RAISE [USING MESSAGE = ...]` and `RETURN`; `THEN RETURN` on DML; `PIVOT`/`UNPIVOT`;
  `FOR SYSTEM_TIME AS OF`; UDF, table-function and procedure DDL;
  `LOAD DATA {INTO|OVERWRITE} ... FROM FILES (...)`; `CREATE SNAPSHOT TABLE ... CLONE`;
  `SET OPTIONS` across `ALTER`, key constraints and collation.
- **Snowflake:** `::` cast and `@stage` as a `FROM` source; `SHOW` and `DESCRIBE`; `CLONE`, `UNDROP`,
  `CREATE`/`ALTER WAREHOUSE`; `CREATE FILE FORMAT` and `COPY INTO` with an inline subquery; stage
  DDL and `LIST @stage`; `CALL`; `INSERT OVERWRITE INTO`; `CREATE EXTERNAL TABLE`;
  `ALTER TABLE ... CLUSTER BY`/`DROP CLUSTERING KEY`; `USE DATABASE/SCHEMA/WAREHOUSE/ROLE`;
  `RETURNING` on DML; `START WITH ... CONNECT BY ... PRIOR`;
  `SELECT * [ILIKE] [EXCLUDE] [RENAME]`; multi-table `INSERT ALL`/`INSERT FIRST`; property lists on
  database, schema and warehouse DDL.
- **Redshift:** `DISTKEY`/`SORTKEY`/`DISTSTYLE`/`ENCODE`, external schemas and tables, `COPY`/
  `UNLOAD`; `ALTER GROUP`, diststyle and sortkey changes, session `SET`; `PARTITIONED BY` on
  external tables; `GRANT ... ON ALL TABLES/FUNCTIONS/PROCEDURES IN SCHEMA`; complete
  user-management DDL; `ALTER TABLE ... APPEND FROM`; `CREATE EXTERNAL FUNCTION ... LAMBDA`;
  `CREATE MATERIALIZED VIEW ... [BACKUP|AUTO REFRESH]`; `CREATE`/`ALTER DATASHARE`; `CREATE MODEL`
  (Redshift ML); `ALTER MATERIALIZED VIEW` and `ALTER DATABASE` actions.
- **SQLite:** `INSERT OR REPLACE|IGNORE`, UPSERT, `AUTOINCREMENT`, `INDEXED BY`/`NOT INDEXED`;
  generated columns; `CREATE TRIGGER ... BEGIN stmt; ... END`; `GLOB` and `MATCH`; `RETURNING` on
  `UPDATE` and `DELETE`; `UPDATE OR <action>`; `BEGIN` isolation modes.
- **DuckDB:** FROM-first `SELECT`, `SELECT * EXCLUDE/REPLACE/RENAME`, lambdas, struct/map/list
  literals, `ASOF`/`POSITIONAL JOIN`, `ATTACH`; `COPY TO`/`FROM` and file-reader table functions;
  `CREATE MACRO`, `EXPORT`/`IMPORT DATABASE`; a bare string literal as a `FROM` source;
  `RETURNING` on DML; `UNION`/`EXCEPT`/`INTERSECT ... BY NAME`; `USING SAMPLE`; open-ended list
  slicing (`l[2:]`, `l[:3]`); `DISTINCT ON`; `ATTACH IF NOT EXISTS`/`OR REPLACE` and
  `DETACH IF EXISTS`.
- **Trino:** `PREPARE`/`EXECUTE`/`DEALLOCATE`, `MATCH_RECOGNIZE`, `TABLESAMPLE`, `ARRAY`/`MAP`/`ROW`
  types, lambdas; `SHOW`, `DESCRIBE`, `ANALYZE`; `SELECT ... FOR UPDATE`;
  `CREATE VIEW ... SECURITY {DEFINER|INVOKER}`; `ALTER TABLE ... EXECUTE proc(...)`; `SET ROLE`;
  `SET TIME ZONE`; `DENY`; `SET PATH`; `SET SESSION AUTHORIZATION`; `SET AUTHORIZATION`,
  `SET PROPERTIES` and `ALTER VIEW ... REFRESH`.
- **Athena:** `UNLOAD`, `MSCK REPAIR TABLE`; `CREATE EXTERNAL TABLE` with Hive storage syntax;
  `VACUUM`; `ALTER TABLE ADD`/`DROP PARTITION` and `SET LOCATION`;
  `OPTIMIZE ... REWRITE DATA USING BIN_PACK` for Iceberg compaction; managed Iceberg
  `CREATE TABLE ... TBLPROPERTIES ('table_type'='ICEBERG')`.
- **ClickHouse:** `ENGINE = MergeTree()`, column `MATERIALIZED`/`ALIAS`/`EPHEMERAL`/`CODEC`/`TTL`,
  `PREWHERE`, `FINAL`, `ARRAY JOIN`, `LIMIT n BY`, `SAMPLE`, `WITH TOTALS`, `ORDER BY ... WITH FILL`;
  mutations including `ALTER UPDATE`/`DELETE ... IN PARTITION`; `KILL QUERY`/`MUTATION` and access
  control DDL; `BACKUP`/`RESTORE`; `EXCHANGE TABLES`; `ALTER TABLE FREEZE`/`UNFREEZE`;
  `INSERT ... RETURNING`; `GLOBAL JOIN` and `x GLOBAL [NOT] IN (...)`; `SELECT *` transformers
  (`EXCEPT`/`APPLY`/`REPLACE`); `INSERT ... FORMAT fmt` and `INSERT INTO FUNCTION f(...)`; `CHECK`,
  `DESCRIBE`, `EXISTS`, `MOVE`, `UNDROP` and collection DDL; settings constraints on roles and
  profiles; `OPTIMIZE` options and `PARTITION ID`.
- **Flink:** connector DDL (`WITH (...)`), `WATERMARK FOR`, windowing TVFs, temporal joins,
  `CREATE CATALOG`, `LOAD`/`UNLOAD MODULE`, statement sets; `LATERAL TABLE(func(...)) AS t(cols)`;
  `MATCH_RECOGNIZE`; `REPLACE TABLE`, `DROP TEMPORARY` and `DROP DATABASE` drop behaviour.
- **Hive:** `LOAD DATA [LOCAL] INPATH`, `INSERT OVERWRITE [LOCAL] DIRECTORY`, multi-table `INSERT`,
  `CLUSTER`/`DISTRIBUTE`/`SORT BY`; `SELECT TRANSFORM(...) USING 'script' AS (...)`; `SHOW` and
  `DESCRIBE [FORMATTED|EXTENDED]`; `ALTER TABLE ... EXCHANGE PARTITION`; `CONCATENATE`;
  `EXPORT`/`IMPORT TABLE`; `CREATE TEMPORARY MACRO`; role DDL.
- **Spark:** `QUALIFY`, `PIVOT`/`UNPIVOT`, query-level `CLUSTER`/`DISTRIBUTE`/`SORT BY`,
  `CREATE TABLE ... USING/OPTIONS`; Spark 4.x `VARIANT`, `MERGE ... BY SOURCE`, collation and
  `SET VAR`; Iceberg DDL (`CALL`, partition transforms, `WRITE ORDERED`/`DISTRIBUTED`);
  `GROUP BY ALL`; `INSERT {INTO|OVERWRITE} TABLE` and `INSERT INTO ... BY NAME`; Delta time travel
  in `FROM`; `CREATE [TEMPORARY] VIEW ... USING source [OPTIONS (...)]`; database DDL options,
  `DROP ... PURGE` and `DROP TEMPORARY FUNCTION`; the inherited Hive role DDL.
- **Databricks:** `CREATE STREAMING TABLE`, `LIVE TABLE` and Unity Catalog objects;
  `APPLY CHANGES INTO`; Iceberg and Unity Catalog `ALTER TABLE` (branches, tags, column position);
  liquid clustering (`CLUSTER BY (...)`, `CLUSTER BY NONE`);
  `CREATE MATERIALIZED VIEW ... [SCHEDULE ...]`; `COPY INTO ... FILEFORMAT = ...`.
- **CockroachDB:** `ALTER TABLE ... SPLIT AT`/`UNSPLIT AT`/`SCATTER`; column families
  (`FAMILY name (cols)`); `SET LOCALITY`; `CONFIGURE ZONE USING`; multi-region DDL and
  `ALTER INDEX` actions.
- **Spanner:** generated columns `col AS (expr) STORED`; `CREATE VIEW ... SQL SECURITY`;
  `CREATE SEQUENCE ... OPTIONS (...)`; `ALTER DATABASE ... SET OPTIONS (...)`;
  `ALTER TABLE ... {ADD|REPLACE|DROP} ROW DELETION POLICY`; identity columns and synonym DDL.
- **Teradata:** `[NOT] CASESPECIFIC`, `UPPERCASE` and `TITLE` column attributes;
  `CREATE {JOIN|HASH} INDEX ... AS SELECT`; atomic UPSERT (`UPDATE ... SET ... ELSE INSERT`);
  `CREATE TABLE ... AS ... WITH [NO] DATA [AND [NO] STATISTICS]`; `CALL`, `DUMP EXPLAIN`,
  `INSERT EXPLAIN`, `EXECUTE FUNCTION`, `SELECT AND CONSUME`, `USING` request modifiers, and index
  and partition analysis.
- **SAP HANA:** `SELECT TOP n`; `ALTER TABLE ... ADD (col type, ...)`; SQLScript control flow
  (`IF`/`ELSEIF`/`ELSE`, `WHILE ... DO`, `FOR ... IN a..b DO`, `BREAK`/`CONTINUE`); SQLScript
  table-variable assignment (`tabvar = SELECT ...`); `EXPORT`, `IMPORT`, `UNSET` and `DO`; index
  rebuild, role groups, table groups and schema synonyms.
- **Upsert targets:** `ON CONFLICT (col) [WHERE ...]` and `ON CONSTRAINT name` in PostgreSQL,
  SQLite, CockroachDB and DuckDB.
- **`GROUP BY ALL`** in Spark, Databricks, BigQuery and Snowflake.

### Bug Fixes

- **Lexer precedence across dialects.** A dialect keyword declared as `token(prec(1, ...))` beat a
  longer base keyword sharing its prefix, so `MATCHED` lexed as `MATCH` + `ED` and broke
  `MERGE ... WHEN MATCHED`. Audited and fixed across every dialect.
- **DuckDB:** restored `MERGE INTO`, removed on the belief that DuckDB has no `MERGE`. Version 1.4.0
  added it.
- **T-SQL:** restored `CREATE MATERIALIZED VIEW`. Azure Synapse dedicated SQL pools support it, and
  this dialect covers Synapse.
- **Spark:** restored `CREATE MATERIALIZED VIEW`, which Spark 4.x documents under Declarative
  Pipelines.
- **Spanner:** restored `SELECT ... FOR UPDATE`, shadowed by the inherited BigQuery
  `FOR SYSTEM_TIME AS OF` clause.
- **MariaDB:** restored the MySQL features its `_column_constraint` override had dropped
  (`AUTO_INCREMENT`, `STORED`/`VIRTUAL` generated columns, foreign key `ON DELETE`/`UPDATE`).
- **Databricks:** restored `iceberg_write_order` and `DISTRIBUTED BY PARTITION`, dropped by the
  `_alter_specifications` override.
- **Spark:** restored the inherited Hive `SHOW`/`DESCRIBE`/`MSCK REPAIR`/`LOAD DATA` statements,
  dropped by the `_ddl_statement` override.
- **Base:** `_decimal_number` no longer eats the first dot of Oracle's `..` range operator.
- **Base:** a `CREATE FUNCTION` with a bare `RETURN` body no longer swallows its own terminator and
  breaks the following statement.
- **MySQL:** dropped `LINES STARTING BY`, which broke MariaDB's `SELECT` path.
- **Db2:** `SET SCHEMA` is reachable as a statement, and `CREATE SECURITY LABEL`'s element list is
  unambiguous.
- **Teradata:** request modifiers are prefixes rather than wrappers, and `KEEP` is reserved in
  `INITIATE INDEX ANALYSIS`.
- **Oracle:** flattened `ALTER INDEX REBUILD`'s option list.
- **BigQuery:** `ADD`'s unnamed constraint form is restricted to the shapes that allow it.
- **ClickHouse:** the operator table lists `ILIKE` rather than `SIMILAR TO`, which ClickHouse does
  not have.
- **SAP HANA:** `ALTER SYSTEM` option values are constrained to a scalar, and the rules duplicating
  `hana_object_statement` were removed.
- **Windows:** `generate.js` uses `fileURLToPath()`, fixing parser generation on Windows paths.
- **Highlights:** removed queries referencing node types that no longer exist.

### Performance

- Resolved self-conflicts with `prec.right` on `interval`, `time`/`timestamp` and T-SQL's
  `output_clause` instead of GLR conflicts.
- Merged T-SQL's bracket and temp-identifier tokens, and dropped MySQL's redundant
  backtick-identifier sequence.
- Dropped unnecessary conflict declarations across dialects, and `SIMILAR TO` from SQLite.
- The dollar-quote scanner keeps its tag size counter on the stack. It was one `malloc`/`free` per
  character of a dollar-quoted body.

### Tooling and CI

- `tools/coverage.py` replaces `scorecard.py`, `corroborate.py`, `parse_rate.py` and
  `diff_parse.py`. Every feature probe is parsed by this grammar and by independent reference
  parsers (SQLGlot, ANTLR grammars-v4, pglast, sqlfluff), so a feature counts as covered only when
  an outside parser agrees. The report surfaces suspect probes (we accept, no reference does) and
  confirmed gaps (we reject, a reference accepts), and scores the base grammar against ISO Core.
- `tools/coverage-probes.yml` carries a per-dialect statement inventory. Scoring one shared feature
  list against all 23 grammars had counted PostgreSQL-only statements as gaps in 20 engines that
  never had them.
- `tools/glr_scan.py` ranks grammars by parse-table size, state count, generation time and peak
  memory.
- `tools/parse_bench.py` measures parse throughput per dialect on a real workload and on shapes that
  provoke GLR stack splitting, reporting how time grows with input size.
- Generated parsers are no longer committed. Generation is hash-cached, self-healing against
  poisoned caches, parallel with a memory cap, and pinned to tree-sitter CLI 0.26.3.
- CI shards the corpus tests, cancels superseded runs, and reuses the matrix's parsers in the
  coverage job.
- The docs site moved to VitePress, with the coverage page generated on every run.

### Documentation

- `README.md`, `AGENTS.md` and `CONTRIBUTING.md` cover all 22 dialects and the current architecture.

## [0.3.11](https://github.com/redpandamc/tree-sitter-sql-extended/releases/tag/v0.3.11) (2026-05-23)

### Features

- Multi-dialect grammar architecture: an ANSI SQL base with independently compiled dialect
  extensions for Spark/Hive, Databricks/Unity Catalog, PostgreSQL and MySQL
- Hash-based grammar caching (`scripts/generate.js`), which skips `tree-sitter generate` when the
  sources are unchanged
- Per-dialect test corpora in `<dialect>/test/corpus/`
- `scripts/bump-version.sh`, which syncs the version across all 5 manifests
- `agents.md`, an architecture guide for grammar composition and dialect extension
