import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

const binding = typeof process.versions.bun === "string"
  // Support `bun build --compile` by being statically analyzable enough to find the .node file at build-time
  ? await import(`${root}/prebuilds/${process.platform}-${process.arch}/tree-sitter-sql.node`)
  : (await import("node-gyp-build")).default(root);

try {
  const nodeTypes = await import(`${root}/src/node-types.json`, { with: { type: "json" } });
  binding.nodeTypeInfo = nodeTypes.default;
} catch { }

const queries = [
  ["HIGHLIGHTS_QUERY", `${root}/queries/highlights.scm`],
  ["INJECTIONS_QUERY", `${root}/queries/injections.scm`],
  ["LOCALS_QUERY", `${root}/queries/locals.scm`],
  ["TAGS_QUERY", `${root}/queries/tags.scm`],
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

export const spark = binding.spark;
export const postgres = binding.postgres;
export const mysql = binding.mysql;
export const databricks = binding.databricks;
export const snowflake = binding.snowflake;
export const bigquery = binding.bigquery;
export const mariadb = binding.mariadb;
export const sqlite = binding.sqlite;
export const hive = binding.hive;
export const oracle = binding.oracle;
export const db2 = binding.db2;
export const tsql = binding.tsql;
export const duckdb = binding.duckdb;
export const trino = binding.trino;
export const athena = binding.athena;
export const redshift = binding.redshift;
export const clickhouse = binding.clickhouse;
export const flink = binding.flink;
export const cockroachdb = binding.cockroachdb;
export const spanner = binding.spanner;
export const teradata = binding.teradata;
export const hana = binding.hana;

export default binding;
