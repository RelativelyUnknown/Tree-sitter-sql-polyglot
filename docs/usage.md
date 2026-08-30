---
title: Usage
---

# Usage

The grammar is published to [crates.io](https://crates.io/crates/tree-sitter-sql-polyglot),
[npm](https://www.npmjs.com/package/@relativelyunknown/tree-sitter-sql-polyglot), and
[PyPI](https://pypi.org/project/tree-sitter-sql-polyglot/), plus Go (resolved directly from this repo),
Swift (via Swift Package Manager), and CMake (also resolved directly from this repo) for C consumers.
All six expose the ANSI SQL base grammar plus all 22 dialect extensions; see [Lazy
loading](#lazy-loading-per-dialect) below for how each one avoids compiling or loading dialects you
don't use.

Every dialect uses the same identifier everywhere it appears: Cargo feature name, npm named export,
Python function suffix, Go subpackage name, Swift product name minus the `TreeSitterSql` prefix, and
CMake option/target name (`TREE_SITTER_SQL_<DIALECT>` / `tree-sitter-sql-<dialect>`). See the [dialect
identifier reference](#dialect-identifier-reference) at the bottom of this page. The full extends-from
table and per-dialect syntax highlights are on the [Overview](/) page.

## Rust (crates.io)

The base (ANSI) grammar is always compiled. Each dialect is gated behind its own Cargo feature, and no
dialect feature is enabled by default: `cargo build` with no features compiles only base. Ask for
exactly the dialects you use, or `full` for all 22 at once:

```toml
# Cargo.toml
[dependencies]
tree-sitter-sql-polyglot = { version = "1", features = ["postgres"] }
# features = ["postgres", "mysql"]  # more than one
# features = ["full"]               # every dialect
tree-sitter = "0.25"
```

```rust
use tree_sitter_sql_polyglot::{LANGUAGE, LANGUAGE_POSTGRES};

let mut parser = tree_sitter::Parser::new();
parser.set_language(&LANGUAGE.into())?;                    // base ANSI grammar, always available
// parser.set_language(&LANGUAGE_POSTGRES.into())?;         // needs features = ["postgres"] (or "full")

let tree = parser.parse("SELECT * FROM users WHERE id = 1", None).unwrap();
assert!(!tree.root_node().has_error());
```

Each dialect also exposes `NODE_TYPES_<DIALECT>` (the `node-types.json` content) and
`HIGHLIGHTS_QUERY_<DIALECT>` (its syntax highlighting query), gated behind the same feature.

## Node.js (npm)

```bash
npm install @relativelyunknown/tree-sitter-sql-polyglot
```

```js
import Parser from "tree-sitter";
import SQL, { postgres, mysql } from "@relativelyunknown/tree-sitter-sql-polyglot";

const parser = new Parser();
parser.setLanguage(SQL);                 // default export: base ANSI grammar
parser.setLanguage(postgres.language);   // named export per dialect: { name, language }

const tree = parser.parse("SELECT * FROM users WHERE id = 1");
```

Every dialect is always importable; what's lazy is loading. `postgres.language` only loads postgres's
compiled addon the first time it's read, so `import { postgres }` alone never touches the other 21
dialects.

## Python (PyPI)

```bash
pip install tree-sitter-sql-polyglot
```

```python
from tree_sitter import Language, Parser
import tree_sitter_sql

parser = Parser(Language(tree_sitter_sql.language()))              # base ANSI grammar
parser = Parser(Language(tree_sitter_sql.language_postgres()))     # per dialect

tree = parser.parse(b"SELECT * FROM users WHERE id = 1")
```

Same shape as Node: `import tree_sitter_sql` only loads the base grammar, and `language_postgres()` is
what loads the postgres extension module. Other dialects stay unloaded until you call their own
`language_*()`.

## Go

Each dialect is its own importable subpackage, with its own `#cgo` directive compiling only that
dialect's `parser.c`/`scanner.c`. Importing `bindings/go/postgres` never compiles the other 21
dialects' C sources.

```bash
go get github.com/relativelyunknown/tree-sitter-sql-polyglot/bindings/go/postgres
```

```go
import (
    tree_sitter_sql "github.com/relativelyunknown/tree-sitter-sql-polyglot/bindings/go"          // base
    postgres "github.com/relativelyunknown/tree-sitter-sql-polyglot/bindings/go/postgres"        // per dialect
    tree_sitter "github.com/tree-sitter/go-tree-sitter"
)

baseLanguage := tree_sitter.NewLanguage(tree_sitter_sql.Language())
postgresLanguage := tree_sitter.NewLanguage(postgres.Language())
```

Each dialect subpackage name is the identifier from the
[reference table](#dialect-identifier-reference) below (`bindings/go/cockroachdb`, etc).

## Swift

Each dialect is its own SPM target and library product, built from only that dialect's own sources. A
consumer's `Package.swift` names only the product(s) it wants.

```swift
// Package.swift
.package(url: "https://github.com/RelativelyUnknown/Tree-sitter-sql-polyglot", from: "1.0.0"),
// ...
.product(name: "TreeSitterSql", package: "tree-sitter-sql-polyglot"),           // base
.product(name: "TreeSitterSqlPostgres", package: "tree-sitter-sql-polyglot"),   // per dialect
```

```swift
import SwiftTreeSitter
import TreeSitterSql
import TreeSitterSqlPostgres

let base = Language(language: tree_sitter_sql())
let postgres = Language(language: tree_sitter_postgres_sql())
```

Each dialect's product name is `TreeSitterSql<Dialect>`, where `<Dialect>` is the identifier from the
table below with its first letter capitalized (`postgres` becomes `TreeSitterSqlPostgres`,
`cockroachdb` becomes `TreeSitterSqlCockroachdb`).

## CMake / C

One CMake project, the same shape as the Cargo feature flags above: a plain `cmake -B build` builds
only base, and each dialect is a CMake option that's off by default. Enable one or more with
`-DTREE_SITTER_SQL_<DIALECT>=ON`, or every dialect at once with `-DTREE_SITTER_SQL_FULL=ON` (the CMake
equivalent of Cargo's `full` feature). Each enabled dialect still produces its own library target/file
(CMake has no equivalent of one artifact exposing conditional symbols the way a Rust crate does), and
regenerates its `parser.c` from `grammar.js` via the `tree-sitter` CLI, so that needs to be on `PATH` —
unlike the other five bindings, which ship a precompiled/committed parser.

```bash
cmake -B build && cmake --build build                                    # base only
cmake -B build -DTREE_SITTER_SQL_POSTGRES=ON && cmake --build build      # base + postgres
cmake -B build -DTREE_SITTER_SQL_FULL=ON && cmake --build build          # base + all 22
```

```c
#include <tree_sitter/tree-sitter-sql.h>           // base
#include <tree_sitter/tree-sitter-sql-postgres.h>  // per dialect

const TSLanguage *base = tree_sitter_sql();
const TSLanguage *postgres = tree_sitter_postgres_sql();
```

Each dialect's CMake option and library name is `TREE_SITTER_SQL_<DIALECT>` /
`tree-sitter-sql-<dialect>`, using the identifier from the [reference
table](#dialect-identifier-reference) below (`TREE_SITTER_SQL_COCKROACHDB` /
`tree-sitter-sql-cockroachdb`, etc).

## Lazy loading per dialect

Compiling and loading all 22 dialects unconditionally would waste time and space for anyone parsing
just one, so each binding uses whatever mechanism is idiomatic for its language:

| | Mechanism | What "unused" costs you |
|---|---|---|
| **Rust** | Cargo feature flags gate `build.rs`'s `cc::Build` calls and `lib.rs`'s `#[cfg(feature = ...)]` items | Nothing: an unrequested dialect is never compiled |
| **Node.js** | 23 separate native addons (one `.node` file per dialect); a self-caching lazy getter on `.language` | Nothing at import time: a dialect's addon only loads the first time `.language` is read |
| **Python** | 23 separate extension modules (`_binding`, `_binding_postgres`, ...); a module-level `__getattr__` (PEP 562) | Nothing at import time: a dialect's extension only loads the first time its `language_*()` is called |
| **Go** | 23 separate subpackages (`bindings/go/postgres`, ...), each its own `#cgo` compilation unit | Nothing: cgo never compiles a subpackage nothing imports |
| **Swift** | 23 separate SPM targets/library products | Nothing: SwiftPM only builds the products your `Package.swift` names |
| **CMake / C** | One `option()` per dialect, off by default, gating that dialect's `add_library()` | Nothing: an unrequested dialect's option stays OFF, so its target is never defined or built |

## Dialect identifier reference

The same identifier is used everywhere: the Cargo feature name, the npm named export, the
`language_<x>` suffix in Python, the Go subpackage name, the Swift product name (capitalize the first
letter and prepend `TreeSitterSql`), and the CMake option/target name
(`TREE_SITTER_SQL_<DIALECT>` / prepend `tree-sitter-sql-`). For example, `cockroachdb` is
`features = ["cockroachdb"]` in Rust, `import { cockroachdb }` in Node, `language_cockroachdb()` in
Python, `bindings/go/cockroachdb` in Go, `TreeSitterSqlCockroachdb` in Swift, and
`-DTREE_SITTER_SQL_COCKROACHDB=ON` / `tree-sitter-sql-cockroachdb` in CMake.

`spark`, `postgres`, `mysql`, `databricks`, `snowflake`, `bigquery`, `mariadb`, `sqlite`, `hive`,
`oracle`, `db2`, `tsql`, `duckdb`, `trino`, `athena`, `redshift`, `clickhouse`, `flink`, `cockroachdb`,
`spanner`, `teradata`, `hana`.
