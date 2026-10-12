---
layout: home
title: tree-sitter-sql-polyglot
editLink: false

hero:
  name: tree-sitter-sql-polyglot
  text: SQL grammars for tree-sitter
  tagline: A strict ANSI base and 22 dialects, each compiled as its own parser.
  actions:
    - theme: brand
      text: Get started
      link: /usage
    - theme: alt
      text: Coverage
      link: /coverage
    - theme: alt
      text: GitHub
      link: https://github.com/RelativelyUnknown/Tree-sitter-sql-polyglot

features:
  - title: 22 dialects
    details: Postgres, MySQL, MariaDB, SQLite, Oracle, Db2, T-SQL, BigQuery, Spanner, Snowflake, Redshift, DuckDB, ClickHouse, Trino, Athena, Flink, Hive, Spark, Databricks, CockroachDB, Teradata and SAP HANA.
  - title: Dialects inherit from their real parent
    details: MariaDB extends MySQL, CockroachDB extends Postgres, Databricks extends Spark which extends Hive. Shared syntax is written once.
  - title: Coverage checked by other parsers
    details: Each feature probe is also parsed by SQLGlot, ANTLR, pglast and sqlfluff. It only counts as covered when one of them agrees.
---

## Packages

Published to [crates.io](https://crates.io/crates/tree-sitter-sql-polyglot),
[npm](https://www.npmjs.com/package/@relativelyunknown/tree-sitter-sql-polyglot) and
[PyPI](https://pypi.org/project/tree-sitter-sql-polyglot/), with Go, Swift and CMake builds straight
from the repo. [Usage](/usage) has install and import examples for each.

## Also here

- [Coverage](/coverage): per-dialect scores and the feature-by-dialect matrix, rebuilt on every push
  to `main`.
- [Changelog](/changelog)
- [Downloads](/downloads): parser sources, bindings and queries from the latest `main`.
