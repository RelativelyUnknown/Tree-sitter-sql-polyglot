---
title: Usage
---

# Usage

The grammar is published to [crates.io](https://crates.io/crates/tree-sitter-sql-polyglot),
[npm](https://www.npmjs.com/package/@relativelyunknown/tree-sitter-sql-polyglot), and
[PyPI](https://pypi.org/project/tree-sitter-sql-polyglot/), plus Go (resolved directly from this repo)
and Swift (via Swift Package Manager). All five expose the ANSI SQL base grammar plus all 22 dialect
extensions; see [Lazy loading](#lazy-loading-per-dialect) below for how each one avoids compiling or
loading dialects you don't use.

Every dialect uses the same identifier everywhere it appears: Cargo feature name, npm named export,
Python function suffix, Go subpackage name, and Swift product name minus the `TreeSitterSql` prefix.
See the [dialect identifier reference](#dialect-identifier-reference) at the bottom of this page. The
full extends-from table and per-dialect syntax highlights are on the [Overview](/) page.

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
use tree_sitter_sql_extended::{LANGUAGE, LANGUAGE_POSTGRES};

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

## Other bindings (C)

`bindings/c` exposes only the base ANSI grammar. It's a thin header/pkg-config wrapper for embedding
this repo's build system directly (CMake, Make), not a per-dialect package like the other five. See
[AGENTS.md](https://github.com/RelativelyUnknown/Tree-sitter-sql-polyglot/blob/main/AGENTS.md) if you
want to embed a specific dialect's `parser.c` directly; every dialect's C sources work standalone the
same way base's does.

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

## Dialect identifier reference

The same identifier is used everywhere: the Cargo feature name, the npm named export, the
`language_<x>` suffix in Python, the Go subpackage name, and the Swift product name (capitalize the
first letter and prepend `TreeSitterSql`). For example, `cockroachdb` is `features = ["cockroachdb"]`
in Rust, `import { cockroachdb }` in Node, `language_cockroachdb()` in Python,
`bindings/go/cockroachdb` in Go, and `TreeSitterSqlCockroachdb` in Swift.

`spark`, `postgres`, `mysql`, `databricks`, `snowflake`, `bigquery`, `mariadb`, `sqlite`, `hive`,
`oracle`, `db2`, `tsql`, `duckdb`, `trino`, `athena`, `redshift`, `clickhouse`, `flink`, `cockroachdb`,
`spanner`, `teradata`, `hana`.
