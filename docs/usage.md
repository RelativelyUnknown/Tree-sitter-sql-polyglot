---
title: Usage
---

# Usage

Every package has the ANSI base grammar plus the 22 dialects. Dialects you don't use are never
compiled or loaded.

A dialect has the same name everywhere: `postgres` is the Cargo feature, the npm export, the Python
`language_postgres()` suffix and the Go subpackage. Swift and CMake capitalize it
(`TreeSitterSqlPostgres`, `TREE_SITTER_SQL_POSTGRES`). The full list is
[at the bottom](#dialect-names).

## Python

```bash
pip install tree-sitter-sql-polyglot
```

```python
from tree_sitter import Language, Parser
import tree_sitter_sql

parser = Parser(Language(tree_sitter_sql.language()))           # ANSI base
parser = Parser(Language(tree_sitter_sql.language_postgres()))  # a dialect

tree = parser.parse(b"SELECT * FROM users WHERE id = 1")
```

`import tree_sitter_sql` loads only the base grammar. Each dialect is a separate extension module,
loaded the first time you call its `language_*()` function.

## Node.js

```bash
npm install @relativelyunknown/tree-sitter-sql-polyglot
```

```js
import Parser from "tree-sitter";
import SQL, { postgres } from "@relativelyunknown/tree-sitter-sql-polyglot";

const parser = new Parser();
parser.setLanguage(SQL);       // ANSI base
parser.setLanguage(postgres);  // a dialect

const tree = parser.parse("SELECT * FROM users WHERE id = 1");
```

Pass the dialect object itself to `setLanguage`, not `postgres.language`. node-tree-sitter keeps
per-language data on the object you give it, and the bare `language` value can't hold it, so
reading the tree crashes.

Each dialect is its own native addon, loaded the first time it's used.

## Rust

Base is always compiled. Dialects are Cargo features, all off by default; `full` turns on all 22.

```toml
[dependencies]
tree-sitter-sql-polyglot = { version = "0.1", features = ["postgres"] }
tree-sitter = "0.25"
```

```rust
use tree_sitter_sql_polyglot::{LANGUAGE, LANGUAGE_POSTGRES};

let mut parser = tree_sitter::Parser::new();
parser.set_language(&LANGUAGE.into())?;            // ANSI base
parser.set_language(&LANGUAGE_POSTGRES.into())?;   // needs the "postgres" feature

let tree = parser.parse("SELECT * FROM users WHERE id = 1", None).unwrap();
```

Each dialect also has `NODE_TYPES_<DIALECT>` and `HIGHLIGHTS_QUERY_<DIALECT>` behind the same
feature.

Building from a git checkout instead of crates.io needs Node, which the build script uses to
generate the dialect highlight queries.

## Go

Every dialect is its own subpackage, and only the ones you import get compiled.

```bash
go get github.com/relativelyunknown/tree-sitter-sql-polyglot/bindings/go/postgres
```

```go
import (
    tree_sitter "github.com/tree-sitter/go-tree-sitter"
    tree_sitter_sql "github.com/relativelyunknown/tree-sitter-sql-polyglot/bindings/go"
    postgres "github.com/relativelyunknown/tree-sitter-sql-polyglot/bindings/go/postgres"
)

base := tree_sitter.NewLanguage(tree_sitter_sql.Language())
pg := tree_sitter.NewLanguage(postgres.Language())
```

## Swift

Every dialect is its own SwiftPM product. Name only the ones you need.

```swift
// Package.swift
.package(url: "https://github.com/RelativelyUnknown/Tree-sitter-sql-polyglot", from: "0.1.0"),
// ...
.product(name: "TreeSitterSql", package: "tree-sitter-sql-polyglot"),
.product(name: "TreeSitterSqlPostgres", package: "tree-sitter-sql-polyglot"),
```

```swift
import SwiftTreeSitter
import TreeSitterSql
import TreeSitterSqlPostgres

let base = Language(language: tree_sitter_sql())
let postgres = Language(language: tree_sitter_postgres_sql())
```

## C / CMake

`cmake -B build` builds only the base. Turn dialects on with `-DTREE_SITTER_SQL_<DIALECT>=ON`, or
all of them with `-DTREE_SITTER_SQL_FULL=ON`. Each dialect becomes its own library. CMake builds
regenerate `parser.c` from the grammar, so the `tree-sitter` CLI has to be on your `PATH`.

```bash
cmake -B build -DTREE_SITTER_SQL_POSTGRES=ON && cmake --build build
```

```c
#include <tree_sitter/tree-sitter-sql.h>
#include <tree_sitter/tree-sitter-sql-postgres.h>

const TSLanguage *base = tree_sitter_sql();
const TSLanguage *postgres = tree_sitter_postgres_sql();
```

## Syntax highlighting

Use the highlights query that matches the grammar you parse with. The base query won't compile
against a dialect, because every dialect drops at least one ANSI keyword it refers to.

| | Base | Dialect |
|---|---|---|
| Python | `tree_sitter_sql.HIGHLIGHTS_QUERY` | `tree_sitter_sql.HIGHLIGHTS_QUERY_POSTGRES` |
| Node | `SQL.HIGHLIGHTS_QUERY` | `postgres.HIGHLIGHTS_QUERY` |
| Rust | `HIGHLIGHTS_QUERY` | `HIGHLIGHTS_QUERY_POSTGRES` |

```python
from tree_sitter import Language, Parser, Query, QueryCursor
import tree_sitter_sql

language = Language(tree_sitter_sql.language_postgres())
query = Query(language, tree_sitter_sql.HIGHLIGHTS_QUERY_POSTGRES)
tree = Parser(language).parse(b"VACUUM ANALYZE users")
captures = QueryCursor(query).captures(tree.root_node)  # {"keyword": [...], "type": [...]}
```

A dialect's query combines the base highlights, its parents' and its own. It's generated at build
time by `scripts/bundle-highlights.js`. In an editor that understands `; inherits:` (Neovim, Helix),
use the hand-written `<dialect>/queries/highlights.scm` files instead.

## Dialect names

`athena`, `bigquery`, `clickhouse`, `cockroachdb`, `databricks`, `db2`, `duckdb`, `flink`, `hana`,
`hive`, `mariadb`, `mysql`, `oracle`, `postgres`, `redshift`, `snowflake`, `spanner`, `spark`,
`sqlite`, `teradata`, `trino`, `tsql`.

For `cockroachdb` that means `features = ["cockroachdb"]`, `import { cockroachdb }`,
`language_cockroachdb()`, `bindings/go/cockroachdb`, `TreeSitterSqlCockroachdb` and
`TREE_SITTER_SQL_COCKROACHDB`.
