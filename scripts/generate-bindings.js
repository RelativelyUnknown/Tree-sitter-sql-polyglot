#!/usr/bin/env node
/**
 * Regenerates the Rust/Node/Python native binding source files so that they
 * expose the base grammar plus every dialect extension as a named export,
 * following the same "one compiled unit, multiple named languages" pattern
 * tree-sitter-typescript uses for {typescript, tsx}.
 *
 * Run after scripts/generate-all.js (each dialect's own src/parser.c must
 * already exist) and whenever a dialect is added or removed.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DIALECT_DIRS = [
  'spark', 'postgres', 'mysql', 'databricks', 'snowflake', 'bigquery',
  'mariadb', 'sqlite', 'hive', 'oracle', 'db2', 'tsql', 'duckdb', 'trino',
  'athena', 'redshift', 'clickhouse', 'flink', 'cockroachdb', 'spanner',
  'teradata', 'hana',
];

const DIALECTS = DIALECT_DIRS.map((dir) => {
  const grammarSrc = readFileSync(`${ROOT}/${dir}/grammar.js`, 'utf8');
  const grammarName = grammarSrc.match(/name:\s*'([^']+)'/)[1];
  return {
    dir,
    grammarName,
    // e.g. "databricks_sql" -> "tree_sitter_databricks_sql"
    cSymbol: `tree_sitter_${grammarName}`,
    // Rust/JS/Python identifier suffix, e.g. "databricks"
    ident: dir,
    upper: dir.toUpperCase(),
  };
});

// ── Rust: bindings/rust/lib.rs ──────────────────────────────────────────────
// Each dialect is gated behind its own Cargo feature (see [features] in
// Cargo.toml) so a consumer who only enables e.g. "postgres" doesn't compile
// or link the other 21 - `cargo build --no-default-features --features
// postgres` only builds base + postgres. The "full" feature enables all 22.
{
  const externs = DIALECTS.map((d) => `    #[cfg(feature = "${d.dir}")]\n    fn ${d.cSymbol}() -> *const ();`).join('\n');
  const consts = DIALECTS.map((d) => `
#[cfg(feature = "${d.dir}")]
/// The tree-sitter [\`LanguageFn\`][LanguageFn] for the ${d.grammarName} dialect.
pub const LANGUAGE_${d.upper}: LanguageFn = unsafe { LanguageFn::from_raw(${d.cSymbol}) };

#[cfg(feature = "${d.dir}")]
/// The content of the \`node-types.json\` file for the ${d.grammarName} dialect.
pub const NODE_TYPES_${d.upper}: &str = include_str!(concat!(env!("OUT_DIR"), "/${d.dir}_node-types.json"));

#[cfg(feature = "${d.dir}")]
/// The syntax highlighting query for the ${d.grammarName} dialect.
pub const HIGHLIGHTS_QUERY_${d.upper}: &str = include_str!("../../${d.dir}/queries/highlights.scm");`).join('\n');

  const tests = DIALECTS.map((d) => `
    #[cfg(feature = "${d.dir}")]
    #[test]
    fn test_can_load_${d.ident}_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_${d.upper}.into())
            .expect("Error loading ${d.grammarName} parser");
    }`).join('\n');

  const content = `//! This crate provides Sql language support for the [tree-sitter][] parsing library,
//! plus every independently compiled dialect extension (see the \`LANGUAGE_*\` constants).
//!
//! Typically, you will use the [LANGUAGE][] constant to add this language to a
//! tree-sitter [Parser][], and then use the parser to parse some code:
//!
//! \`\`\`
//! let code = r#"
//! "#;
//! let mut parser = tree_sitter::Parser::new();
//! let language = tree_sitter_sql_extended::LANGUAGE;
//! parser
//!     .set_language(&language.into())
//!     .expect("Error loading Sql parser");
//! let tree = parser.parse(code, None).unwrap();
//! assert!(!tree.root_node().has_error());
//! \`\`\`
//!
//! [Parser]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/

use tree_sitter_language::LanguageFn;

extern "C" {
    fn tree_sitter_sql() -> *const ();
${externs}
}

/// The tree-sitter [\`LanguageFn\`][LanguageFn] for this grammar.
///
/// [LanguageFn]: https://docs.rs/tree-sitter-language/*/tree_sitter_language/struct.LanguageFn.html
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sql) };

/// The content of the [\`node-types.json\`][] file for this grammar.
///
/// [\`node-types.json\`]: https://tree-sitter.github.io/tree-sitter/using-parsers#static-node-types
pub const NODE_TYPES: &str = include_str!(concat!(env!("OUT_DIR"), "/base_node-types.json"));

pub const HIGHLIGHTS_QUERY: &str = include_str!("../../queries/highlights.scm");
${consts}

#[cfg(test)]
mod tests {
    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE.into())
            .expect("Error loading Sql parser");
    }
${tests}
}
`;
  writeFileSync(`${ROOT}/bindings/rust/lib.rs`, content);
}

// ── Rust: bindings/rust/build.rs ────────────────────────────────────────────
// Each dialect's compile() call only runs when Cargo has that dialect's
// feature enabled (CARGO_FEATURE_<NAME> is the env var Cargo sets for an
// active feature) - so `cargo build --features postgres` never even
// compiles the other 21 dialects' parser.c, not just fails to link them.
{
  const compileCalls = [`    compile("tree-sitter-sql", "base", "src".as_ref());`]
    .concat(DIALECTS.map((d) => `    if env::var("CARGO_FEATURE_${d.upper}").is_ok() {
        compile("tree-sitter-sql-${d.ident}", "${d.dir}", "${d.dir}/src".as_ref());
    }`))
    .join('\n');

  const content = `use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn out_dir() -> PathBuf {
    PathBuf::from(env::var("OUT_DIR").unwrap())
}

/// Decompresses the committed \`<src_dir>/<file>.br\` blob into
/// \`<OUT_DIR>/<ident>_<file>\` and returns that path. The crate ships only
/// Brotli-compressed parser.c/node-types.json (see
/// scripts/compress-parsers.js) to stay under crates.io's size limit;
/// \`cargo publish\`'s verify step forbids build scripts from writing back into
/// the source tree, so the inflated file must live under OUT_DIR instead.
fn inflate(src_dir: &Path, ident: &str, file: &str) -> PathBuf {
    let blob_path = src_dir.join(format!("{file}.br"));
    println!("cargo:rerun-if-changed={}", blob_path.display());

    let compressed = fs::read(&blob_path).unwrap_or_else(|e| {
        panic!("missing {}: {e} (run \`node scripts/compress-parsers.js\`)", blob_path.display())
    });

    let mut out = Vec::new();
    brotli::BrotliDecompress(&mut compressed.as_slice(), &mut out)
        .unwrap_or_else(|e| panic!("failed to inflate {}: {e}", blob_path.display()));

    let out_path = out_dir().join(format!("{ident}_{file}"));
    fs::write(&out_path, out).unwrap_or_else(|e| panic!("failed to write {}: {e}", out_path.display()));
    out_path
}

fn compile(name: &str, ident: &str, src_dir: &Path) {
    let mut c_config = cc::Build::new();
    c_config.std("c11").include(src_dir);

    #[cfg(target_env = "msvc")]
    c_config.flag("-utf-8");

    if std::env::var("TARGET").unwrap() == "wasm32-unknown-unknown" {
        let Ok(wasm_headers) = std::env::var("DEP_TREE_SITTER_LANGUAGE_WASM_HEADERS") else {
            panic!("Environment variable DEP_TREE_SITTER_LANGUAGE_WASM_HEADERS must be set by the language crate");
        };
        let Ok(wasm_src) =
            std::env::var("DEP_TREE_SITTER_LANGUAGE_WASM_SRC").map(std::path::PathBuf::from)
        else {
            panic!("Environment variable DEP_TREE_SITTER_LANGUAGE_WASM_SRC must be set by the language crate");
        };

        c_config.include(&wasm_headers);
        c_config.files([
            wasm_src.join("stdio.c"),
            wasm_src.join("stdlib.c"),
            wasm_src.join("string.c"),
        ]);
    }

    let parser_path = inflate(src_dir, ident, "parser.c");
    c_config.file(&parser_path);

    inflate(src_dir, ident, "node-types.json");

    let scanner_path = src_dir.join("scanner.c");
    if scanner_path.exists() {
        c_config.file(&scanner_path);
        println!("cargo:rerun-if-changed={}", scanner_path.to_str().unwrap());
    }

    c_config.compile(name);
}

fn main() {
${compileCalls}

    println!("cargo:rustc-check-cfg=cfg(with_highlights_query)");
    if !"queries/highlights.scm".is_empty() && std::path::Path::new("queries/highlights.scm").exists() {
        println!("cargo:rustc-cfg=with_highlights_query");
    }
    println!("cargo:rustc-check-cfg=cfg(with_injections_query)");
    if !"queries/injections.scm".is_empty() && std::path::Path::new("queries/injections.scm").exists() {
        println!("cargo:rustc-cfg=with_injections_query");
    }
    println!("cargo:rustc-check-cfg=cfg(with_locals_query)");
    if !"queries/locals.scm".is_empty() && std::path::Path::new("queries/locals.scm").exists() {
        println!("cargo:rustc-cfg=with_locals_query");
    }
    println!("cargo:rustc-check-cfg=cfg(with_tags_query)");
    if !"queries/tags.scm".is_empty() && std::path::Path::new("queries/tags.scm").exists() {
        println!("cargo:rustc-cfg=with_tags_query");
    }
}
`;
  writeFileSync(`${ROOT}/bindings/rust/build.rs`, content);
}

// ── Node: bindings/node/binding.cc + binding_<dialect>.cc ───────────────────
// Each dialect is compiled into its OWN native addon (own NODE_API_MODULE,
// own .node file - see binding.gyp) instead of one combined addon with all
// 22 registered in a single Init(). That's what lets index.js dlopen only
// the dialect actually used instead of always loading all 22's compiled
// parse tables. base's binding.cc keeps today's shape (no exportBlocks).
const LANGUAGE_TYPE_TAG_DECL = `// "tree-sitter", "language" hashed with BLAKE2
const napi_type_tag LANGUAGE_TYPE_TAG = {
    0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16
};`;

{
  const content = `#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_sql();

${LANGUAGE_TYPE_TAG_DECL}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "sql");
    auto language = Napi::External<TSLanguage>::New(env, tree_sitter_sql());
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;
    return exports;
}

NODE_API_MODULE(tree_sitter_sql_binding, Init)
`;
  writeFileSync(`${ROOT}/bindings/node/binding.cc`, content);
}

for (const d of DIALECTS) {
  const content = `#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *${d.cSymbol}();

${LANGUAGE_TYPE_TAG_DECL}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "${d.grammarName}");
    auto language = Napi::External<TSLanguage>::New(env, ${d.cSymbol}());
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;
    return exports;
}

NODE_API_MODULE(tree_sitter_sql_${d.ident}_binding, Init)
`;
  writeFileSync(`${ROOT}/bindings/node/binding_${d.ident}.cc`, content);
}

// ── Node: binding.gyp ────────────────────────────────────────────────────────
// One node-gyp target per dialect (+ base), each producing its own .node
// file under build/Release/ - see bindings/node/index.js for why (a single
// combined addon can't be loaded "one dialect at a time").
{
  const cflagsConditions = `            "conditions": [
                ["OS!='win'", {
                    "cflags_c": [
                        "-std=c11",
                    ],
                }, {  # OS == "win"
                    "cflags_c": [
                      "/std:c11",
                      "/utf-8",
                    ],
                }],
            ],`;

  const baseTarget = `        {
            "target_name": "tree_sitter_sql_binding",
            "dependencies": [
                "<!(node -p \\"require('node-addon-api').targets\\"):node_addon_api_except",
            ],
            "include_dirs": ["src"],
            "sources": [
                "bindings/node/binding.cc",
                "src/parser.c",
                "src/scanner.c",
            ],
${cflagsConditions}
        }`;

  const dialectTargets = DIALECTS.map((d) => `        {
            "target_name": "tree_sitter_sql_${d.ident}_binding",
            "dependencies": [
                "<!(node -p \\"require('node-addon-api').targets\\"):node_addon_api_except",
            ],
            "include_dirs": ["${d.dir}/src"],
            "sources": [
                "bindings/node/binding_${d.ident}.cc",
                "${d.dir}/src/parser.c",
                "${d.dir}/src/scanner.c",
            ],
${cflagsConditions}
        }`).join(',\n');

  const content = `{
    "targets": [
${[baseTarget, dialectTargets].join(',\n')}
    ]
}
`;
  writeFileSync(`${ROOT}/binding.gyp`, content);
}

// ── Node: bindings/node/index.js ────────────────────────────────────────────
// Each dialect is its own compiled addon (see binding.gyp), so importing
// { postgres } shouldn't dlopen the other 21's. A dialect's `language` is
// therefore a lazy, self-caching getter: the addon is only require()'d the
// first time `.language` is actually read, not at import time.
{
  const isBunImports = DIALECTS.map((d) => `const ${d.ident}Bun = isBun ? await import(\`\${root}/prebuilds/\${process.platform}-\${process.arch}/tree_sitter_sql_${d.ident}_binding.node\`) : null;`).join('\n');

  const dialectExports = DIALECTS.map((d) => `export const ${d.ident} = lazyDialect("${d.grammarName}", "tree_sitter_sql_${d.ident}_binding", () => ${d.ident}Bun);`).join('\n');

  const content = `import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const isBun = typeof process.versions.bun === "string";
const require = isBun ? null : createRequire(import.meta.url);

// node-gyp-build itself always resolves to "whichever .node file sorts first
// alphabetically" in build/Release/ (see its getFirst()) - fine when a
// package only ever compiles one native addon, not when it compiles 23. This
// mirrors its directory search order (dev build output, then a
// platform/arch prebuild) but for one exact target filename, so only that
// dialect's addon is dlopen'd.
function loadTarget(targetName) {
  const candidates = [
    join(root, "build", "Release", \`\${targetName}.node\`),
    join(root, "build", "Debug", \`\${targetName}.node\`),
    join(root, "prebuilds", \`\${process.platform}-\${process.arch}\`, \`\${targetName}.node\`),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return require(file);
  }
  throw new Error(\`No native build found for "\${targetName}". Looked in:\\n  \${candidates.join("\\n  ")}\`);
}

function lazyDialect(grammarName, targetName, getBunBinding) {
  const dialect = { name: grammarName };
  Object.defineProperty(dialect, "language", {
    configurable: true,
    enumerable: true,
    get() {
      // Bun's bundler needs statically analyzable import() calls to find
      // .node files at \`bun build --compile\` time, so it can't share
      // loadTarget()'s fully dynamic require() path - it gets its own
      // eager-but-per-dialect import above instead (still not the OTHER 21
      // dialects, just not deferred the way Node's require() path is).
      const value = (isBun ? getBunBinding() : loadTarget(targetName)).language;
      Object.defineProperty(dialect, "language", { value, enumerable: true, configurable: true });
      return value;
    }
  });
  return dialect;
}

${isBunImports}

const binding = isBun
  // Support \`bun build --compile\` by being statically analyzable enough to find the .node file at build-time
  ? await import(\`\${root}/prebuilds/\${process.platform}-\${process.arch}/tree_sitter_sql_binding.node\`)
  : loadTarget("tree_sitter_sql_binding");

try {
  const nodeTypes = await import(\`\${root}/src/node-types.json\`, { with: { type: "json" } });
  binding.nodeTypeInfo = nodeTypes.default;
} catch { }

const queries = [
  ["HIGHLIGHTS_QUERY", \`\${root}/queries/highlights.scm\`],
  ["INJECTIONS_QUERY", \`\${root}/queries/injections.scm\`],
  ["LOCALS_QUERY", \`\${root}/queries/locals.scm\`],
  ["TAGS_QUERY", \`\${root}/queries/tags.scm\`],
];

for (const [prop, path] of queries) {
  Object.defineProperty(binding, prop, {
    configurable: true,
    enumerable: true,
    get() {
      delete binding[prop];
      try {
        binding[prop] = readFileSync(path, "utf8");
      } catch { }
      return binding[prop];
    }
  });
}

${dialectExports}

export default binding;
`;
  writeFileSync(`${ROOT}/bindings/node/index.js`, content);
}

// ── Node: bindings/node/index.d.ts ──────────────────────────────────────────
{
  const dialectDecls = DIALECTS.map((d) => `
/** The tree-sitter language object for the ${d.grammarName} dialect. */
export declare const ${d.ident}: { name: string; language: unknown };`).join('\n');

  const content = `type BaseNode = {
  type: string;
  named: boolean;
};

type ChildNode = {
  multiple: boolean;
  required: boolean;
  types: BaseNode[];
};

type NodeInfo =
  | (BaseNode & {
      subtypes: BaseNode[];
    })
  | (BaseNode & {
      fields: { [name: string]: ChildNode };
      children: ChildNode[];
    });

/**
 * The tree-sitter language object for this grammar.
 *
 * @see {@linkcode https://tree-sitter.github.io/node-tree-sitter/interfaces/Parser.Language.html Parser.Language}
 *
 * @example
 * import Parser from "tree-sitter";
 * import SQL from "tree-sitter-sql";
 *
 * const parser = new Parser();
 * parser.setLanguage(SQL);
 */
declare const binding: {
  /**
   * The inner language object.
   * @private
   */
  language: unknown;

  /**
   * The content of the \`node-types.json\` file for this grammar.
   *
   * @see {@linkplain https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types Static Node Types}
   */
  nodeTypeInfo: NodeInfo[];

  /** The syntax highlighting query for this grammar. */
  HIGHLIGHTS_QUERY?: string;

  /** The language injection query for this grammar. */
  INJECTIONS_QUERY?: string;

  /** The local variable query for this grammar. */
  LOCALS_QUERY?: string;

  /** The symbol tagging query for this grammar. */
  TAGS_QUERY?: string;
};

export default binding;
${dialectDecls}
`;
  writeFileSync(`${ROOT}/bindings/node/index.d.ts`, content);
}

// ── Python: binding.c + binding_<dialect>.c ─────────────────────────────────
// Each dialect gets its own extension module (own PyInit_, own .pyd/.so - see
// setup.py) instead of one combined `_binding` module registering all 22
// language_* functions. That's what lets __init__.py's __getattr__ import
// only the dialect actually accessed instead of always loading all 22's
// compiled parse tables at `import tree_sitter_sql` time.
{
  const content = `#include <Python.h>

typedef struct TSLanguage TSLanguage;

TSLanguage *tree_sitter_sql(void);

static PyObject* _binding_language(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_sql(), "tree_sitter.Language", NULL);
}

static struct PyModuleDef_Slot slots[] = {
#ifdef Py_GIL_DISABLED
    {Py_mod_gil, Py_MOD_GIL_NOT_USED},
#endif
    {0, NULL}
};

static PyMethodDef methods[] = {
    {"language", _binding_language, METH_NOARGS,
     "Get the tree-sitter language for this grammar."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    .m_base = PyModuleDef_HEAD_INIT,
    .m_name = "_binding",
    .m_doc = NULL,
    .m_size = 0,
    .m_methods = methods,
    .m_slots = slots,
};

PyMODINIT_FUNC PyInit__binding(void) {
    return PyModuleDef_Init(&module);
}
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/binding.c`, content);
}

for (const d of DIALECTS) {
  const content = `#include <Python.h>

typedef struct TSLanguage TSLanguage;

TSLanguage *${d.cSymbol}(void);

static PyObject* _binding_language_${d.ident}(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(${d.cSymbol}(), "tree_sitter.Language", NULL);
}

static struct PyModuleDef_Slot slots[] = {
#ifdef Py_GIL_DISABLED
    {Py_mod_gil, Py_MOD_GIL_NOT_USED},
#endif
    {0, NULL}
};

static PyMethodDef methods[] = {
    {"language_${d.ident}", _binding_language_${d.ident}, METH_NOARGS,
     "Get the tree-sitter language for the ${d.grammarName} dialect."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    .m_base = PyModuleDef_HEAD_INIT,
    .m_name = "_binding_${d.ident}",
    .m_doc = NULL,
    .m_size = 0,
    .m_methods = methods,
    .m_slots = slots,
};

PyMODINIT_FUNC PyInit__binding_${d.ident}(void) {
    return PyModuleDef_Init(&module);
}
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/binding_${d.ident}.c`, content);
}

// ── Python: bindings/python/tree_sitter_sql/__init__.py ─────────────────────
// Each dialect's language_<x>() lives in its own extension module
// (_binding_<x>, see binding_<dialect>.c / setup.py) instead of all being
// re-exported eagerly from one combined `_binding` module - a plain `from
// ._binding import language_postgres, language_mysql, ...` would import
// (and dlopen) all 22 the moment anyone did `import tree_sitter_sql`. The
// module-level __getattr__ (PEP 562) below only imports a dialect's own
// module the first time that dialect's function is actually accessed.
{
  const reexports = DIALECTS.map((d) => `"language_${d.ident}": "_binding_${d.ident}",`).join('\n    ');
  const allNames = DIALECTS.map((d) => `"language_${d.ident}"`).join(',\n    ');

  const content = `"""Tree-sitter Grammar for SQL"""

import importlib
from importlib.resources import files as _files

from ._binding import language

# name -> extension module holding it, for the lazy __getattr__ below.
_DIALECT_MODULES = {
    ${reexports}
}


def _get_query(name, file):
    query = _files(f"{__package__}.queries") / file
    globals()[name] = query.read_text()
    return globals()[name]


def __getattr__(name):
    if name in _DIALECT_MODULES:
        module = importlib.import_module(f".{_DIALECT_MODULES[name]}", __package__)
        fn = getattr(module, name)
        globals()[name] = fn
        return fn

    # NOTE: uncomment these to include any queries that this grammar contains:

    if name == "HIGHLIGHTS_QUERY":
        return _get_query("HIGHLIGHTS_QUERY", "highlights.scm")
    # if name == "INJECTIONS_QUERY":
    #     return _get_query("INJECTIONS_QUERY", "injections.scm")
    # if name == "LOCALS_QUERY":
    #     return _get_query("LOCALS_QUERY", "locals.scm")
    # if name == "TAGS_QUERY":
    #     return _get_query("TAGS_QUERY", "tags.scm")

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "language",
    ${allNames},
    "HIGHLIGHTS_QUERY",
    # "INJECTIONS_QUERY",
    # "LOCALS_QUERY",
    # "TAGS_QUERY",
]


def __dir__():
    return sorted(__all__ + [
        "__all__", "__builtins__", "__cached__", "__doc__", "__file__",
        "__loader__", "__name__", "__package__", "__path__", "__spec__",
    ])
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/__init__.py`, content);
}

// ── Python: bindings/python/tree_sitter_sql/__init__.pyi ────────────────────
{
  const fnDecls = DIALECTS.map((d) => `
def language_${d.ident}() -> CapsuleType:
    """The tree-sitter language function for the ${d.grammarName} dialect."""`).join('\n');

  const content = `from typing import Final
from typing_extensions import CapsuleType

HIGHLIGHTS_QUERY: Final[str] | None
"""The syntax highlighting query for this grammar."""

INJECTIONS_QUERY: Final[str] | None
"""The language injection query for this grammar."""

LOCALS_QUERY: Final[str] | None
"""The local variable query for this grammar."""

TAGS_QUERY: Final[str] | None
"""The symbol tagging query for this grammar."""

def language() -> CapsuleType:
    """The tree-sitter language function for this grammar."""
${fnDecls}
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/__init__.pyi`, content);
}

console.log(`generate-bindings: wrote Rust/Node/Python bindings for base + ${DIALECTS.length} dialects.`);
