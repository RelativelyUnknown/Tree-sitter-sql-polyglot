---
layout: home
title: tree-sitter-sql-extended
editLink: false

hero:
  name: tree-sitter-sql-extended
  text: A multi-dialect SQL grammar for tree-sitter
  tagline: An ANSI SQL base plus 22 independently compiled dialect grammars, layered via tree-sitter's grammar(parent, overrides) composition.
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
  - title: Genealogy-based inheritance
    details: Dialects extend their real-world parent (mariadb → mysql, databricks → spark → hive, cockroachdb → postgres, spanner → bigquery) rather than a flat list, so shared syntax is written once.
  - title: CI-verified completeness
    details: A weighted feature registry is parsed against every dialect's compiled grammar on every push. See the live coverage report for per-dialect scores and gaps.
---

## What this is

The grammar restructures the upstream [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql)
"permissive" grammar into a strict ANSI SQL base plus dialect extensions. Each dialect compiles to its
own `<dialect>/src/parser.c` and can be used independently. See the
[README](https://github.com/RedPandaMC/tree-sitter-sql-extended#readme) for the full dialect table and
install instructions, and [AGENTS.md](https://github.com/RedPandaMC/tree-sitter-sql-extended/blob/main/AGENTS.md)
for the grammar architecture.

- **[Dialect coverage](/coverage)**: generated on every CI run, with per-dialect scores, the inheritance
  tree, and the full feature × dialect matrix.
- **[Changelog](/changelog)**: release history.
- **[Downloads](/downloads)**: parser build artifacts (grammar sources, bindings, queries) mirrored
  from the latest `main`.
