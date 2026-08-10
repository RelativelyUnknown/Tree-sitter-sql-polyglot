---
layout: home
title: tree-sitter-sql-extended
editLink: false

hero:
  name: tree-sitter-sql-extended
  text: A multi-dialect SQL grammar for tree-sitter
  tagline: An ANSI SQL base plus 22 independently compiled dialect grammars, layered with tree-sitter's grammar(parent, overrides) composition.
  actions:
    - theme: brand
      text: Dialect coverage
      link: /coverage
    - theme: alt
      text: View on GitHub
      link: https://github.com/RedPandaMC/tree-sitter-sql-extended
    - theme: alt
      text: Downloads
      link: /downloads

features:
  - title: 22 dialects on a shared base
    details: postgres, mysql, mariadb, oracle, db2, tsql, bigquery, snowflake, redshift, sqlite, duckdb, trino, athena, clickhouse, flink, hive, spark, databricks, cockroachdb, spanner, teradata, and hana. Each extends the ANSI base or a real parent dialect.
  - title: Inheritance follows real dialects
    details: Each dialect extends its real-world parent (mariadb -> mysql, databricks -> spark -> hive, cockroachdb -> postgres, spanner -> bigquery) rather than sitting in a flat list, so shared syntax is written once.
  - title: Coverage checked against other parsers
    details: Every feature probe is parsed by this grammar and by SQLGlot, ANTLR grammars-v4, pglast and sqlfluff. A feature counts as covered only when an outside parser agrees.
---

## What this is

The grammar restructures the upstream [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql)
"permissive" grammar into a strict ANSI SQL base plus dialect extensions. Each dialect compiles to its
own `<dialect>/src/parser.c` and can be used independently. The
[README](https://github.com/RedPandaMC/tree-sitter-sql-extended#readme) has the full dialect table and
install instructions, and [AGENTS.md](https://github.com/RedPandaMC/tree-sitter-sql-extended/blob/main/AGENTS.md)
covers the grammar architecture.

- [Dialect coverage](/coverage), generated on every CI run, with per-dialect scores, the inheritance
  tree and the full feature-by-dialect matrix.
- [Changelog](/changelog), the release history.
- [Downloads](/downloads), the parser build artifacts (grammar sources, bindings, queries) mirrored
  from the latest `main`.
