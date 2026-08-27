type BaseNode = {
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
   * The content of the `node-types.json` file for this grammar.
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

/** The tree-sitter language object for the spark_sql dialect. */
export declare const spark: { name: string; language: unknown };

/** The tree-sitter language object for the postgres_sql dialect. */
export declare const postgres: { name: string; language: unknown };

/** The tree-sitter language object for the mysql_sql dialect. */
export declare const mysql: { name: string; language: unknown };

/** The tree-sitter language object for the databricks_sql dialect. */
export declare const databricks: { name: string; language: unknown };

/** The tree-sitter language object for the snowflake_sql dialect. */
export declare const snowflake: { name: string; language: unknown };

/** The tree-sitter language object for the bigquery_sql dialect. */
export declare const bigquery: { name: string; language: unknown };

/** The tree-sitter language object for the mariadb_sql dialect. */
export declare const mariadb: { name: string; language: unknown };

/** The tree-sitter language object for the sqlite_sql dialect. */
export declare const sqlite: { name: string; language: unknown };

/** The tree-sitter language object for the hive_sql dialect. */
export declare const hive: { name: string; language: unknown };

/** The tree-sitter language object for the oracle_sql dialect. */
export declare const oracle: { name: string; language: unknown };

/** The tree-sitter language object for the db2_sql dialect. */
export declare const db2: { name: string; language: unknown };

/** The tree-sitter language object for the tsql dialect. */
export declare const tsql: { name: string; language: unknown };

/** The tree-sitter language object for the duckdb_sql dialect. */
export declare const duckdb: { name: string; language: unknown };

/** The tree-sitter language object for the trino_sql dialect. */
export declare const trino: { name: string; language: unknown };

/** The tree-sitter language object for the athena_sql dialect. */
export declare const athena: { name: string; language: unknown };

/** The tree-sitter language object for the redshift_sql dialect. */
export declare const redshift: { name: string; language: unknown };

/** The tree-sitter language object for the clickhouse_sql dialect. */
export declare const clickhouse: { name: string; language: unknown };

/** The tree-sitter language object for the flink_sql dialect. */
export declare const flink: { name: string; language: unknown };

/** The tree-sitter language object for the cockroachdb_sql dialect. */
export declare const cockroachdb: { name: string; language: unknown };

/** The tree-sitter language object for the spanner_sql dialect. */
export declare const spanner: { name: string; language: unknown };

/** The tree-sitter language object for the teradata_sql dialect. */
export declare const teradata: { name: string; language: unknown };

/** The tree-sitter language object for the hana_sql dialect. */
export declare const hana: { name: string; language: unknown };
