---
title: Usage
---

# Usage

The grammar is published to three package registries — [crates.io](https://crates.io/crates/tree-sitter-sql-extended),
[npm](https://www.npmjs.com/package/@relativelyunknown/tree-sitter-sql-extended), and
[PyPI](https://pypi.org/project/tree-sitter-sql-extended/) — each exposing the ANSI SQL base grammar
plus all 22 dialect extensions. All three are designed so that using one dialect never compiles or
loads the other 21's parsers; see [Lazy loading](#lazy-loading-per-dialect) below for how that works
and what it means for you in practice.

Every dialect uses the same identifier everywhere it appears (Cargo feature name, npm named export,
Python function suffix) — see the [dialect identifier reference](#dialect-identifier-reference) at the
bottom of this page. The full extends-from table and per-dialect syntax highlights are on the
[Overview](/) page.

## Rust (crates.io)

The base (ANSI) grammar is always compiled. Each dialect is gated behind its own Cargo feature, and
**no dialect feature is enabled by default** — `cargo build` with no features compiles only base. Ask
for exactly the dialects you use, or `full` for all 22 at once:

```toml
# Cargo.toml
[dependencies]
tree-sitter-sql-extended = { version = "1", features = ["postgres"] }
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

Each dialect also exposes `NODE_TYPES_<DIALECT>` (the `node-types.json` content, for tools that need
static node-type metadata) and `HIGHLIGHTS_QUERY_<DIALECT>` (its syntax highlighting query), gated
behind the same feature.

## Node.js (npm)

```bash
npm install @relativelyunknown/tree-sitter-sql-extended
```

```js
import Parser from "tree-sitter";
import SQL, { postgres, mysql } from "@relativelyunknown/tree-sitter-sql-extended";

const parser = new Parser();
parser.setLanguage(SQL);                 // default export: base ANSI grammar
parser.setLanguage(postgres.language);   // named export per dialect: { name, language }

const tree = parser.parse("SELECT * FROM users WHERE id = 1");
```

Unlike Rust, there's nothing to opt into up front — every dialect is always importable. What's lazy is
*loading*: `postgres.language` only dlopens postgres's compiled addon the first time it's read, so
`import { postgres }` alone never touches the other 21 dialects' compiled parsers.

## Python (PyPI)

```bash
pip install tree-sitter-sql-extended
```

```python
from tree_sitter import Language, Parser
import tree_sitter_sql

parser = Parser(Language(tree_sitter_sql.language()))              # base ANSI grammar
parser = Parser(Language(tree_sitter_sql.language_postgres()))     # per dialect

tree = parser.parse(b"SELECT * FROM users WHERE id = 1")
```

Same shape as Node: `import tree_sitter_sql` only loads the base grammar. Calling
`language_postgres()` is what actually loads the postgres extension module — other dialects stay
unloaded until (and unless) you call their own `language_*()`.

## Other bindings (C, Go, Swift)

`bindings/c`, `bindings/go`, and `bindings/swift` currently expose **only the base ANSI grammar** —
they were not extended with the 22 dialects the way Rust/Node/Python were, so there's no
`tree_sitter_postgres_sql()` equivalent to call yet in Go or Swift. See
[AGENTS.md](https://github.com/RelativelyUnknown/tree-sitter-sql-extended/blob/main/AGENTS.md) if
you're interested in adding that.

```go
import (
    tree_sitter_sql "github.com/relativelyunknown/tree-sitter-sql-extended/bindings/go"
    tree_sitter "github.com/tree-sitter/go-tree-sitter"
)

language := tree_sitter.NewLanguage(tree_sitter_sql.Language())
```

```swift
import SwiftTreeSitter
import TreeSitterSql

let language = Language(language: tree_sitter_sql())
try parser.setLanguage(language)
```

If dialects are added there in the future, both ecosystems can express the same "only compile/load
what you use" property Rust/Node/Python have, via mechanisms native to each:

- **Go**: cgo compiles whatever `.go` file is actually part of the build, so the natural approach is
  one importable subpackage per dialect (`bindings/go/postgres`, own `#cgo` directive over
  `postgres/src/parser.c`) rather than a Cargo-style feature flag — Go doesn't have those, but its own
  package-import graph already gives you the same result: a package nothing imports is never compiled
  or linked, full stop.
- **Swift**: Swift Package Manager already supports multiple targets/library products in one
  `Package.swift` (that's how umbrella packages normally work), so the equivalent is one SPM target +
  product per dialect; a consumer only depends on the products they want, and SPM only builds those.

Both are genuinely possible and, in fact, arguably more natural fits than Rust's Cargo-feature
approach — they'd just require building out the 22-dialect exposure for Go/Swift first, which hasn't
happened yet.

## Lazy loading per dialect

Every dialect's generated parser is a large, independent state machine (some `parser.c` sources run
into the tens of MB before compression). Compiling and loading all 22 unconditionally would be wasteful
for anyone who only parses one dialect's SQL, so each language binding uses whatever mechanism is
idiomatic for compiling/loading only what's referenced:

| | Mechanism | What "unused" costs you |
|---|---|---|
| **Rust** | Cargo feature flags gate `build.rs`'s `cc::Build` calls and `lib.rs`'s `#[cfg(feature = ...)]` items | Nothing — an unrequested dialect is never compiled, not just excluded from linking |
| **Node.js** | 23 separate native addons (one `.node` file per dialect); a self-caching lazy getter on `.language` | Nothing at import time — a dialect's addon only `dlopen`s the first time `.language` is read |
| **Python** | 23 separate extension modules (`_binding`, `_binding_postgres`, ...); a module-level `__getattr__` (PEP 562) | Nothing at import time — a dialect's extension only loads the first time its `language_*()` is called |

## Dialect identifier reference

The same identifier is used for the Cargo feature name, the npm named export, and the `language_<x>`
suffix in Python — e.g. `cockroachdb` is `features = ["cockroachdb"]` in Rust, `import { cockroachdb }`
in Node, and `language_cockroachdb()` in Python.

`spark`, `postgres`, `mysql`, `databricks`, `snowflake`, `bigquery`, `mariadb`, `sqlite`, `hive`,
`oracle`, `db2`, `tsql`, `duckdb`, `trino`, `athena`, `redshift`, `clickhouse`, `flink`, `cockroachdb`,
`spanner`, `teradata`, `hana`.
