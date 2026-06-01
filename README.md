# tree-sitter-sql-extended

A multi-dialect SQL parser for [tree-sitter](https://tree-sitter.github.io/), forked from
[DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql). It restructures the
upstream "permissive" grammar into a clean ANSI SQL base plus **17 independently compiled dialect
grammars**, each layered on top via tree-sitter's `grammar(parent, overrides)` composition.

Originally built as the SQL parser backend for [burnt](https://github.com/RedPandaMC/burnt) — a cost
compiler and linter for Spark pipelines — it now aims for broad dialect coverage across the SQL ecosystem.

---

## Dialects

Each dialect compiles to its own `<dialect>/src/parser.c` and can be used independently.

| Dialect | Extends | Highlights |
|---------|---------|-----------|
| **base** (ANSI) | — | `GRANT`/`REVOKE`, `GROUP BY ROLLUP`/`CUBE`/`GROUPING SETS`, `FETCH FIRST`/`OFFSET … FETCH`, `WITHIN GROUP`, `TRIM(… FROM …)`, interval qualifiers |
| **hive** | base | `LATERAL VIEW`, `STORED AS`/`STORED BY`, multi-table `INSERT`, `LOAD DATA INPATH`, `CLUSTER`/`DISTRIBUTE`/`SORT BY` |
| **spark** | hive | `QUALIFY`, `PIVOT`/`UNPIVOT`, time travel, scripting (`IF`/`WHILE`/`LOOP`), Iceberg, `VARIANT`, `CREATE TABLE … USING/OPTIONS` |
| **databricks** | spark | Delta/DLT (`OPTIMIZE … ZORDER BY`, `VACUUM`, `RESTORE`), Unity Catalog (`CATALOG`/`VOLUME`/`EXTERNAL LOCATION`, `GRANT`), Iceberg `CALL` |
| **postgres** | base | `COPY`, `VACUUM`, `PARTITION BY`/`PARTITION OF`, `CREATE TABLE (LIKE …)`, `INHERITS`, extensions, RLS policies, `::` cast |
| **mysql** | base | `ENGINE=`/`CHARSET=`, index hints, `SHOW`, `DESCRIBE`, `LIMIT offset, count`, `@`/`@@` variables |
| **mariadb** | mysql | `INVISIBLE` columns (plus inherited MySQL features) |
| **oracle** | base | `CONNECT BY`, PL/SQL blocks, packages, cursors, `FORALL`, `BULK COLLECT`, numeric `FOR … IN 1..10` |
| **db2** | base | SQL PL (`BEGIN…END`, `IF`/`WHILE`/`LOOP`, `LEAVE`/`ITERATE`), modules, audit policies, federated objects |
| **tsql** | base | T-SQL scripting, `CROSS`/`OUTER APPLY`, query hints, `#temp`/`##global` identifiers |
| **bigquery** | base | `INT64`/`STRUCT<…>`/`ARRAY<…>` types, `UNNEST`, backtick identifiers, `QUALIFY` |
| **snowflake** | base | scripting, `LATERAL FLATTEN`, time travel, `@stage` sources, `::` cast |
| **sqlite** | base | `INSERT OR REPLACE/IGNORE`, UPSERT, `AUTOINCREMENT`, `INDEXED BY` |
| **duckdb** | base | FROM-first `SELECT`, `SELECT * EXCLUDE/REPLACE/RENAME`, lambdas, struct/map/list literals, `ASOF`/`POSITIONAL JOIN`, `ATTACH` |
| **trino** | base | `PREPARE`/`EXECUTE`/`DEALLOCATE`, `MATCH_RECOGNIZE`, `TABLESAMPLE BERNOULLI/SYSTEM`, `ARRAY`/`MAP`/`ROW` types, lambdas |
| **athena** | trino | `UNLOAD … TO 's3://…'`, `MSCK REPAIR TABLE … PARTITIONS` (managed Trino + data-lake semantics) |
| **redshift** | base | `DISTKEY`/`SORTKEY`/`DISTSTYLE`/`ENCODE`, `CREATE EXTERNAL SCHEMA/TABLE`, `COPY`/`UNLOAD`, `VACUUM REINDEX`, `APPROXIMATE COUNT` |
| **clickhouse** | base | `ENGINE = MergeTree() …`, column `MATERIALIZED`/`ALIAS`/`EPHEMERAL`/`CODEC`/`TTL`, `PREWHERE`, `FINAL`, `ARRAY JOIN`, `LIMIT n BY`, `SAMPLE`, `WITH TOTALS`, `QUALIFY`, `ORDER BY … WITH FILL`, `LIMIT … WITH TIES`, `INTO OUTFILE`/`FORMAT`, `ALTER … UPDATE`/`DELETE`, `OPTIMIZE … FINAL`, `CREATE DICTIONARY`/`LIVE VIEW`, `SYSTEM …`, `Map`/`Tuple`/`Nested`/`LowCardinality`/`Nullable` types |

Dependency chains: `databricks → spark → hive → base`, `mariadb → mysql → base`, and `athena → trino → base`.
Regenerate the child when a parent grammar changes. See [AGENTS.md](AGENTS.md) for the full architecture.

---

## Using in Rust

```toml
# Cargo.toml
[dependencies]
tree-sitter-sql-extended = { git = "https://github.com/RedPandaMC/tree-sitter-sql-extended", branch = "main" }
tree-sitter = "0.25"
```

```rust
use tree_sitter_sql_extended::LANGUAGE;

let mut parser = tree_sitter::Parser::new();
parser.set_language(&LANGUAGE.into()).unwrap();

let tree = parser.parse(sql_source, None).unwrap();
// tree is valid even on syntax errors — partial results, not None
```

The parser degrades gracefully: a syntax error in one statement produces an `ERROR` node; the rest of the
file continues to parse normally.

---

## Development

### Prerequisites

```bash
npm install -g tree-sitter-cli
```

### Workflow

```bash
# Regenerate the base parser after editing grammar.js or grammar/**/*.js
npm run generate

# Regenerate a single dialect (and its parent chain as needed)
npm run generate:spark

# Regenerate every parser (base + all 17 dialects)
npm run generate:all

# Run corpus tests for the base grammar
npm run test:corpus

# Run corpus tests for a specific dialect
npm run test:corpus:spark

# Verify base keyword ↔ queries/highlights.scm sync
npm run test:keywords
```

Generation is hash-cached: `npm run generate*` skips `tree-sitter generate` when the relevant grammar
sources are unchanged. Use `npm run generate:force` to bypass the cache.

Base grammar rules are split across `grammar/` (e.g. `grammar/statements/*.js`, `grammar/expressions.js`,
`grammar/keywords.js`). Dialect rules live under `<dialect>/grammar/`. A change to the base ripples to all
12 parsers, so regenerate and test all of them after editing base files.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for more detail.

---

## Upstream

This fork tracks [`DerekStride/tree-sitter-sql`](https://github.com/DerekStride/tree-sitter-sql). Upstreaming
Databricks-specific extensions is encouraged where the upstream maintainers are interested; extensions that are
too vendor-specific will live here permanently.

---

## References

- [Wikipedia SQL syntax](https://en.wikipedia.org/wiki/SQL_syntax)
- [Databricks SQL reference](https://docs.databricks.com/en/sql/language-manual/index.html)
- [Apache Spark SQL reference](https://spark.apache.org/docs/latest/sql-ref.html)
- [Apache Hive language manual](https://cwiki.apache.org/confluence/display/Hive/LanguageManual)
- [Unity Catalog SQL reference](https://docs.databricks.com/en/data-governance/unity-catalog/index.html)
- [Apache Iceberg Spark procedures](https://iceberg.apache.org/docs/latest/spark-procedures/)
- [PostgreSQL syntax](https://www.postgresql.org/docs/current/sql-commands.html)
- [MySQL reference manual](https://dev.mysql.com/doc/refman/8.4/en/)
- [MariaDB SQL statements](https://mariadb.com/kb/en/sql-statements/)
- [Oracle PL/SQL language reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/index.html)
- [IBM Db2 SQL reference](https://www.ibm.com/docs/en/db2/11.5?topic=reference-sql)
- [Microsoft T-SQL reference](https://learn.microsoft.com/en-us/sql/t-sql/language-reference)
- [BigQuery SQL reference](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax)
- [Snowflake SQL reference](https://docs.snowflake.com/en/sql-reference)
- [SQLite SQL syntax](https://www.sqlite.org/lang.html)

### Other SQL tree-sitter grammars

- [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql) — upstream
- [takegue/tree-sitter-sql-bigquery](https://github.com/takegue/tree-sitter-sql-bigquery) — BigQuery fork (same pattern as this repo)
- [m-novikov/tree-sitter-sql](https://github.com/m-novikov/tree-sitter-sql)
