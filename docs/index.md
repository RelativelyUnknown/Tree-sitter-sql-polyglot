---
layout: default
---

# tree-sitter-sql-extended

A multi-dialect SQL parser for [tree-sitter](https://tree-sitter.github.io/) — a clean ANSI SQL base
plus 17 independently compiled dialect grammars (Spark, Hive, Databricks, PostgreSQL, MySQL, MariaDB,
Oracle, Db2, T-SQL, BigQuery, Snowflake, SQLite, DuckDB, Trino, Athena, Redshift, ClickHouse).

The grammar is defined at [github://redpandamc/tree-sitter-sql-extended](https://github.com/RedPandaMC/tree-sitter-sql-extended).
It is forked from [github://derekstride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql).

See the [README](https://github.com/RedPandaMC/tree-sitter-sql-extended#readme) for dialect coverage and
[AGENTS.md](https://github.com/RedPandaMC/tree-sitter-sql-extended/blob/main/AGENTS.md) for the grammar
architecture.

The artifacts can also be found here:

{% for file in site.static_files %}
[{{ file.path }}](/tree-sitter-sql{{ file.path }})
{% endfor %}
