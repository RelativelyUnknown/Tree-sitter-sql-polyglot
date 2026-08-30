# tree-sitter-sql-extended

A multi-dialect SQL parser for [tree-sitter](https://tree-sitter.github.io/). It provides an ANSI SQL
base plus 22 independently compiled dialect grammars, each layered on top with tree-sitter's
`grammar(parent, overrides)` composition.

The grammar is a fork of [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql).
Upstream ships a single "permissive" grammar that mixes several dialects together. This fork splits
that into a strict ANSI base and one grammar per dialect, so each engine's syntax is parsed on its
own terms.

[Docs site](https://relativelyunknown.github.io/tree-sitter-sql-extended/) and
[dialect coverage](https://relativelyunknown.github.io/tree-sitter-sql-extended/coverage), which carries the
per-dialect feature scores and is regenerated from the live parsers on every push to `main`.

---

## Dialects

Each dialect compiles to its own `<dialect>/src/parser.c` and can be used independently.

| Dialect | Extends | Highlights |
|---------|---------|-----------|
| **base** (ANSI) | none | `GRANT`/`REVOKE`, `GROUP BY ROLLUP`/`CUBE`/`GROUPING SETS`, `FETCH FIRST`/`OFFSET ... FETCH`, `WITHIN GROUP`, `TRIM(... FROM ...)`, interval qualifiers |
| **hana** | base | `CREATE COLUMN/ROW TABLE`, `UPSERT ... WITH PRIMARY KEY`, `WITH HINT (...)`, SQLScript procedures (`LANGUAGE SQLSCRIPT`, `DECLARE`, `:=`, `:param`) |
| **hive** | base | `LATERAL VIEW`, `STORED AS`/`STORED BY`, multi-table `INSERT`, `LOAD DATA INPATH`, `CLUSTER`/`DISTRIBUTE`/`SORT BY` |
| **spark** | hive | `QUALIFY`, `PIVOT`/`UNPIVOT`, time travel, scripting (`IF`/`WHILE`/`LOOP`), Iceberg, `VARIANT`, `CREATE TABLE ... USING/OPTIONS` |
| **databricks** | spark | Delta/DLT (`OPTIMIZE ... ZORDER BY`, `VACUUM`, `RESTORE`), Unity Catalog (`CATALOG`/`VOLUME`/`EXTERNAL LOCATION`, `GRANT`), Iceberg `CALL` |
| **postgres** | base | `COPY`, `VACUUM`, `PARTITION BY`/`PARTITION OF`, `CREATE TABLE (LIKE ...)`, `INHERITS`, extensions, RLS policies, `::` cast |
| **mysql** | base | `ENGINE=`/`CHARSET=`, index hints, `SHOW`, `DESCRIBE`, `LIMIT offset, count`, `@`/`@@` variables |
| **mariadb** | mysql | `INVISIBLE` columns (plus inherited MySQL features) |
| **oracle** | base | `CONNECT BY`, PL/SQL blocks, packages, cursors, `FORALL`, `BULK COLLECT`, numeric `FOR ... IN 1..10` |
| **db2** | base | SQL PL (`BEGIN...END`, `IF`/`WHILE`/`LOOP`, `LEAVE`/`ITERATE`), modules, audit policies, federated objects |
| **tsql** | base | T-SQL scripting, `CROSS`/`OUTER APPLY`, query hints, `#temp`/`##global` identifiers |
| **bigquery** | base | `INT64`/`STRUCT<...>`/`ARRAY<...>` types, `UNNEST`, backtick identifiers, `QUALIFY` |
| **snowflake** | base | scripting, `LATERAL FLATTEN`, time travel, `@stage` sources, `::` cast |
| **sqlite** | base | `INSERT OR REPLACE/IGNORE`, UPSERT, `AUTOINCREMENT`, `INDEXED BY` |
| **spanner** | bigquery | trailing `PRIMARY KEY`, `INTERLEAVE IN PARENT ... ON DELETE CASCADE`, `NULL_FILTERED`/`STORING` indexes, `CREATE CHANGE STREAM`, `ROW DELETION POLICY`, `STRING(n\|MAX)`/`BYTES(n\|MAX)` |
| **duckdb** | base | FROM-first `SELECT`, `SELECT * EXCLUDE/REPLACE/RENAME`, lambdas, struct/map/list literals, `ASOF`/`POSITIONAL JOIN`, `ATTACH` |
| **teradata** | base | `SEL`/`DEL` abbreviations, `SET`/`MULTISET`/`VOLATILE` tables, `[UNIQUE] PRIMARY INDEX`/`NO PRIMARY INDEX`, `PARTITION BY RANGE_N`/`CASE_N`, `COLLECT STATISTICS`, `CREATE MACRO`, `TOP n`, `QUALIFY`, `:param` references |
| **trino** | base | `PREPARE`/`EXECUTE`/`DEALLOCATE`, `MATCH_RECOGNIZE`, `TABLESAMPLE BERNOULLI/SYSTEM`, `ARRAY`/`MAP`/`ROW` types, lambdas |
| **athena** | trino | `UNLOAD ... TO 's3://...'`, `MSCK REPAIR TABLE ... PARTITIONS` (managed Trino plus data-lake semantics) |
| **redshift** | base | `DISTKEY`/`SORTKEY`/`DISTSTYLE`/`ENCODE`, `CREATE EXTERNAL SCHEMA/TABLE`, `COPY`/`UNLOAD`, `VACUUM REINDEX`, `APPROXIMATE COUNT` |
| **cockroachdb** | postgres | `AS OF SYSTEM TIME`, `UPSERT INTO`, `BACKUP`/`RESTORE`, `IMPORT INTO ... CSV DATA`, `CREATE CHANGEFEED`, hash-sharded indexes (`USING HASH`), `STORING (...)`, `SHOW JOBS`/`GRANTS`/`DATABASES` |
| **clickhouse** | base | `ENGINE = MergeTree() ...`, column `MATERIALIZED`/`ALIAS`/`EPHEMERAL`/`CODEC`/`TTL`, `PREWHERE`, `FINAL`, `ARRAY JOIN`, `LIMIT n BY`, `SAMPLE`, `WITH TOTALS`, `QUALIFY`, `ORDER BY ... WITH FILL`, `LIMIT ... WITH TIES`, `INTO OUTFILE`/`FORMAT`, `ALTER ... UPDATE`/`DELETE`, `OPTIMIZE ... FINAL`, `CREATE DICTIONARY`/`LIVE VIEW`, `SYSTEM ...`, `Map`/`Tuple`/`Nested`/`LowCardinality`/`Nullable` types |
| **flink** | base | connector DDL (`WITH (...)`), `WATERMARK FOR`, windowing TVFs (`TUMBLE`/`HOP`/`CUMULATE`), `MATCH_RECOGNIZE`, temporal joins, `CREATE CATALOG`, `LOAD`/`UNLOAD MODULE`, statement sets |

Dependency chains: `databricks -> spark -> hive -> base`, `mariadb -> mysql -> base`, `athena -> trino -> base`,
`cockroachdb -> postgres -> base`, and `spanner -> bigquery -> base`. The chains follow real dialect
genealogy: CockroachDB is PostgreSQL-compatible by design, and Spanner and BigQuery share GoogleSQL.
Regenerate the child when a parent grammar changes. See [AGENTS.md](AGENTS.md) for the full architecture.

---

## Installation

Every dialect is compiled/loaded lazily in all five: importing or depending on the package never pulls
in more than the base grammar until you actually ask for a specific dialect.

```bash
cargo add tree-sitter-sql-extended --features postgres   # or: --features full (all 22)
npm install @relativelyunknown/tree-sitter-sql-extended
pip install tree-sitter-sql-extended
go get github.com/relativelyunknown/tree-sitter-sql-extended/bindings/go/postgres
# Swift: add https://github.com/RelativelyUnknown/tree-sitter-sql-extended as a package dependency
```

```rust
use tree_sitter_sql_extended::{LANGUAGE, LANGUAGE_POSTGRES};

let mut parser = tree_sitter::Parser::new();
parser.set_language(&LANGUAGE.into()).unwrap();            // base ANSI grammar
// parser.set_language(&LANGUAGE_POSTGRES.into()).unwrap(); // needs features = ["postgres"] or "full"
```

Each dialect's identifier (`postgres`, `databricks`, `cockroachdb`, ...) is the same everywhere it
appears: Cargo feature, npm/Python/Go/Swift name. See the [Usage
page](https://relativelyunknown.github.io/tree-sitter-sql-extended/usage) for full import examples in
every language, the lazy-loading mechanism per binding, and the complete identifier reference.

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

# Regenerate every parser (base + all 22 dialects)
npm run generate:all

# Run corpus tests for the base grammar
npm run test:corpus

# Run corpus tests for a specific dialect
npm run test:corpus:spark

# Check that base keywords are in sync with queries/highlights.scm
npm run test:keywords
```

Generation is hash-cached: `npm run generate*` skips `tree-sitter generate` when the relevant grammar
sources are unchanged. Use `npm run generate:force` to bypass the cache.

Base grammar rules are split across `grammar/` (e.g. `grammar/statements/*.js`, `grammar/expressions.js`,
`grammar/keywords.js`). Dialect rules live under `<dialect>/grammar/`. A change to the base ripples to all
22 parsers, so regenerate and test all of them after editing base files.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for more detail.

---

## Upstream

This fork tracks [`DerekStride/tree-sitter-sql`](https://github.com/DerekStride/tree-sitter-sql).
General extensions are worth sending upstream if the maintainers there want them. Vendor-specific
ones stay here.

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

- [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql): upstream
- [takegue/tree-sitter-sql-bigquery](https://github.com/takegue/tree-sitter-sql-bigquery): BigQuery fork
- [m-novikov/tree-sitter-sql](https://github.com/m-novikov/tree-sitter-sql)

---

## Fork history & attribution

This repo was forked from [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql)
with its full git history preserved, rather than starting from a fresh commit. That's deliberate: the
ANSI base and the original grammar structure this rework built on top of are Derek Stride's and every
upstream contributor's work, and preserving history keeps that attribution intact and `git blame`
meaningful all the way back.

One side effect: GitHub's Contributors graph is computed from commit authorship across a repo's *entire*
history, not just commits since the fork. So it lists every author who ever committed to the upstream
project - including people who never touched the dialect-extension rework here - alongside this repo's
actual contributors. That list is purely historical record; it grants no repo access and implies no
involvement in this fork's work. Actual ownership and review responsibility live in
[CODEOWNERS](.github/CODEOWNERS), a separate and much shorter list. `LICENSE` reflects the same split:
the original 2021 copyright notice stays (required by its MIT terms), with a second line added for this
fork's own contributions.
