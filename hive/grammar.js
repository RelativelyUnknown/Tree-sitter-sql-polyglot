import base from '../grammar.js';
import { paren_list, optional_parenthesis, comma_list, wrapped_in_parenthesis, make_keyword } from '../grammar/helpers.js';
import hive_storage_rules from './grammar/storage.js';
import hive_partition_rules from './grammar/partition.js';
import hive_lateral_view_rules from './grammar/lateral_view.js';

export default grammar(base, {
  name: 'hive_sql',

  conflicts: $ => [
    [$.object_reference, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    [$.between_expression, $.binary_expression],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.interval],
    [$.stored_by],
    [$.row_format],
    [$.skewed_by],
    [$.cluster_by],
    [$.distribute_by],
    [$.sort_by],
    [$.multi_table_insert],
    [$.select, $.multi_table_insert],
  ],

  rules: {

    // Hive DDL: no Spark 4.x variable statements, no scripting constructs,
    // no Iceberg-specific statements.  MSCK REPAIR TABLE is Hive/Impala-specific.
    _ddl_statement: $ => choice(
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $._rename_statement,
      $._merge_statement,
      $._refresh_statement,
      $.comment_statement,
      $.set_statement,
      $.reset_statement,
      $.use_statement,
      $.msck_repair_statement,
      $.load_data,
      $.grant_statement,
      $.revoke_statement,
      $.show_statement,
      $.describe_statement,
    ),

    // Override _dml_write to include Hive's multi-table insert and overwrite-directory
    _dml_write: $ => seq(
      optional($._cte),
      choice(
        $._delete_statement,
        $._insert_statement,
        $._update_statement,
        $._truncate_statement,
        $.multi_table_insert,
        $.insert_overwrite_directory,
      ),
    ),

    // LOAD DATA [LOCAL] INPATH 'path' [OVERWRITE] INTO TABLE tbl [PARTITION (key=val)]
    load_data: $ => seq(
      $.keyword_load,
      $.keyword_data,
      optional($.keyword_local),
      $.keyword_inpath,
      alias($._literal_string, $.literal),
      optional($.keyword_overwrite),
      $.keyword_into,
      $.keyword_table,
      $.object_reference,
      optional($.table_partition),
    ),

    // INSERT OVERWRITE [LOCAL] DIRECTORY 'path' [ROW FORMAT ...] [STORED AS ...]
    // SELECT ...
    insert_overwrite_directory: $ => seq(
      $.keyword_insert,
      $.keyword_overwrite,
      optional($.keyword_local),
      $.keyword_directory,
      alias($._literal_string, $.literal),
      repeat(
        choice(
          $.row_format,
          $.stored_as,
        ),
      ),
      $._dml_read,
    ),

    // FROM src INSERT [OVERWRITE] [INTO] TABLE tbl [PARTITION] SELECT/VALUES ...
    // (one or more INSERT targets in a single scan)
    multi_table_insert: $ => seq(
      $.keyword_from,
      $.object_reference,
      optional($._alias),
      repeat1(
        seq(
          $.keyword_insert,
          optional(choice($.keyword_overwrite, $.keyword_into)),
          optional($.keyword_table),
          $.object_reference,
          optional($.table_partition),
          choice(
            seq($.keyword_select, $.select_expression, optional($.where)),
            $._insert_values,
          ),
        ),
      ),
    ),

    // CREATE TABLE with EXTERNAL support and HiveQL table settings
    create_table: $ => prec.left(
      seq(
        $.keyword_create,
        optional(
          choice(
            $._temporary,
            $.keyword_external,
          ),
        ),
        $.keyword_table,
        optional($._if_not_exists),
        $.object_reference,
        seq(
          optional($.column_definitions),
          repeat($._table_settings),
          optional(seq($.keyword_as, $.create_query)),
        ),
      ),
    ),

    // Hive _table_settings: hive_compat storage rules + Hive-specific STORED BY / SKEWED BY.
    // No shallow_clone (Databricks-only).
    _table_settings: $ => choice(
      $.table_partition,
      $.stored_as,
      $.stored_by,
      $.storage_location,
      $.table_sort,
      $.table_cluster,
      $.row_format,
      $.skewed_by,
      seq($.keyword_tblproperties, paren_list($.table_option, true)),
      seq($.keyword_without, $.keyword_oids),
      $.storage_parameters,
      $.table_option,
    ),

    // INSERT OVERWRITE ... PARTITION (key=val) — core HiveQL DML
    insert: $ => seq(
      $.keyword_insert,
      optional($.keyword_ignore),
      optional(
        choice(
          $.keyword_into,
          $.keyword_overwrite,
        ),
      ),
      $.object_reference,
      optional($.table_partition),
      optional(
        seq(
          $.keyword_as,
          field('alias', $.identifier),
        ),
      ),
      choice(
        $._insert_values,
        $._set_values,
      ),
      optional(
        choice(
          $._on_conflict,
          $._on_duplicate_key_update,
        ),
      ),
    ),

    // ALTER TABLE specifications: add_partition (from hive_compat) but no Iceberg ops
    _alter_specifications: $ => choice(
      $.add_partition,
      $.add_column,
      $.add_constraint,
      $.drop_constraint,
      $.alter_column,
      $.modify_column,
      $.change_column,
      $.drop_column,
      $.rename_object,
      $.rename_column,
      $.set_schema,
      $.change_ownership,
      $.exchange_partition,
    ),

    // FROM with LATERAL VIEW, CLUSTER/DISTRIBUTE/SORT BY support
    from: $ => seq(
      $.keyword_from,
      optional($.keyword_only),
      comma_list($.relation, true),
      repeat(
        choice(
          $.join,
          $.cross_join,
          $.lateral_join,
          $.lateral_cross_join,
          $.lateral_view,
        ),
      ),
      optional($.where),
      optional($.group_by),
      optional($.having),
      optional($.window_clause),
      optional($.order_by),
      optional(
        choice(
          $.cluster_by,
          $.distribute_by,
          $.sort_by,
        ),
      ),
      optional($.limit),
      optional($.offset_fetch_clause),
    ),

    // CLUSTER BY col [, col]
    cluster_by: $ => seq(
      $.keyword_cluster,
      $.keyword_by,
      comma_list($._expression, true),
    ),

    // DISTRIBUTE BY col [, col]
    distribute_by: $ => seq(
      $.keyword_distribute,
      $.keyword_by,
      comma_list($._expression, true),
    ),

    // SORT BY col [ASC|DESC] [, col]
    sort_by: $ => seq(
      $.keyword_sort,
      $.keyword_by,
      comma_list($.order_target, true),
    ),

    // TABLESAMPLE with BUCKET n OUT OF n support (Hive-specific bucket sampling)
    tablesample: $ => seq(
      $.keyword_tablesample,
      '(',
      choice(
        seq($._natural_number, $.keyword_rows),
        seq($._natural_number, $.keyword_percent),
        seq($.keyword_bucket, $._natural_number, $.keyword_out, $.keyword_of, $._natural_number),
      ),
      ')',
    ),

    // Hive/Databricks class-backed UDF: CREATE FUNCTION name AS 'class' [USING JAR 'path']
    create_function: $ => prec.left(seq(
      $.keyword_create,
      optional($._or_replace),
      $.keyword_function,
      optional($._if_not_exists),
      $.object_reference,
      choice(
        seq(
          $.function_arguments,
          optional(seq(
            $.keyword_returns,
            choice(
              $._type,
              seq($.keyword_setof, $._type),
              seq($.keyword_table, $.column_definitions),
              $.keyword_trigger,
            ),
          )),
          repeat(
            choice(
              $.function_language,
              $.function_volatility,
              $.function_leakproof,
              $.function_security,
              $.function_safety,
              $.function_strictness,
              $.function_cost,
              $.function_rows,
              $.function_support,
              $.function_handler,
              $.function_environment,
              $.function_parameter_style,
            ),
          ),
          optional($.function_body),
          repeat(
            choice(
              $.function_language,
              $.function_volatility,
              $.function_leakproof,
              $.function_security,
              $.function_safety,
              $.function_strictness,
              $.function_cost,
              $.function_rows,
              $.function_support,
              $.function_handler,
              $.function_environment,
              $.function_parameter_style,
            ),
          ),
        ),
        seq(
          $.keyword_as,
          field('class', alias($._literal_string, $.literal)),
          optional(seq($.keyword_using, $.keyword_jar, field('jar', alias($._literal_string, $.literal)))),
        ),
      ),
    )),

    function_handler: $ => seq(
      $.keyword_handler,
      alias($._literal_string, $.literal),
    ),

    function_environment: $ => seq(
      $.keyword_environment,
      '(',
      repeat(seq($.identifier, '=', alias($._literal_string, $.literal), optional(','))),
      ')',
    ),

    function_parameter_style: $ => seq(
      $.keyword_parameter,
      $.keyword_style,
      $.identifier,
    ),

    // SELECT TRANSFORM(cols) [ROW FORMAT ...] USING 'script' [AS (schema)] [ROW FORMAT ...]
    select: $ => seq(
      $.keyword_select,
      choice(
        seq(
          optional($.keyword_distinct),
          $.select_expression,
        ),
        $.transform_clause,
      ),
    ),

    transform_clause: $ => prec.right(seq(
      $.keyword_transform,
      paren_list($._expression, true),
      optional($.row_format),
      $.keyword_using,
      field('script', alias($._literal_string, $.literal)),
      optional(
        seq(
          $.keyword_as,
          choice(
            paren_list($.column_definition, true),
            comma_list($.identifier, true),
          ),
        ),
      ),
      optional($.row_format),
    )),

    // SHOW PARTITIONS / TABLES / DATABASES / SCHEMAS / FUNCTIONS
    show_statement: $ => prec.right(seq(
      $.keyword_show,
      choice(
        seq(
          $.keyword_partitions,
          $.object_reference,
          optional($.partition_spec),
        ),
        seq(
          $.keyword_tables,
          optional(seq(choice($.keyword_from, $.keyword_in), $.object_reference)),
          optional(seq(optional($.keyword_like), alias($._literal_string, $.literal))),
        ),
        seq(
          choice($.keyword_databases, $.keyword_schemas),
          optional(seq($.keyword_like, alias($._literal_string, $.literal))),
        ),
        seq(
          $.keyword_functions,
          optional(seq($.keyword_like, alias($._literal_string, $.literal))),
        ),
      ),
    )),

    // DESCRIBE [FORMATTED|EXTENDED] table [PARTITION (...)] [col]
    describe_statement: $ => prec.right(seq(
      choice($.keyword_describe, $.keyword_desc),
      optional(choice($.keyword_formatted, $.keyword_extended)),
      $.object_reference,
      optional($.partition_spec),
      optional(field('column', $.identifier)),
    )),

    // PARTITION (key=value, ...) — values may be any expression
    partition_spec: $ => seq(
      $.keyword_partition,
      paren_list(
        seq(field('key', $.identifier), '=', field('value', $._expression)),
        true,
      ),
    ),

    // ALTER TABLE target EXCHANGE PARTITION (spec) WITH TABLE source
    exchange_partition: $ => seq(
      $.keyword_exchange,
      $.partition_spec,
      $.keyword_with,
      $.keyword_table,
      $.object_reference,
    ),

    // Hive-specific keywords — token(prec(1,...)) so the lexer prefers these over
    // the base _identifier pattern when both are valid in a parse state.
    keyword_serde:           _ => token(prec(1, make_keyword("serde"))),
    keyword_serdeproperties: _ => token(prec(1, make_keyword("serdeproperties"))),
    keyword_skewed:          _ => token(prec(1, make_keyword("skewed"))),
    keyword_directories:     _ => token(prec(1, make_keyword("directories"))),
    keyword_stored:          _ => token(prec(1, make_keyword("stored"))),
    keyword_cached:          _ => token(prec(1, make_keyword("cached"))),
    keyword_uncached:        _ => token(prec(1, make_keyword("uncached"))),
    keyword_replication:     _ => token(prec(1, make_keyword("replication"))),
    keyword_tblproperties:   _ => token(prec(1, make_keyword("tblproperties"))),
    keyword_location:        _ => token(prec(1, make_keyword("location"))),
    keyword_partitioned:     _ => token(prec(1, make_keyword("partitioned"))),
    keyword_sort:            _ => token(prec(1, make_keyword("sort"))),
    keyword_sorted:          _ => token(prec(1, make_keyword("sorted"))),
    keyword_format:          _ => token(prec(1, make_keyword("format"))),
    keyword_delimited:       _ => token(prec(1, make_keyword("delimited"))),
    keyword_delimiter:       _ => token(prec(1, make_keyword("delimiter"))),
    keyword_fields:          _ => token(prec(1, make_keyword("fields"))),
    keyword_terminated:      _ => token(prec(1, make_keyword("terminated"))),
    keyword_escaped:         _ => token(prec(1, make_keyword("escaped"))),
    keyword_lines:           _ => token(prec(1, make_keyword("lines"))),
    keyword_parquet:         _ => token(prec(1, make_keyword("parquet"))),
    keyword_rcfile:          _ => token(prec(1, make_keyword("rcfile"))),
    keyword_csv:             _ => token(prec(1, make_keyword("csv"))),
    keyword_textfile:        _ => token(prec(1, make_keyword("textfile"))),
    keyword_avro:            _ => token(prec(1, make_keyword("avro"))),
    keyword_sequencefile:    _ => token(prec(1, make_keyword("sequencefile"))),
    keyword_orc:             _ => token(prec(1, make_keyword("orc"))),
    keyword_jsonfile:        _ => token(prec(1, make_keyword("jsonfile"))),
    keyword_clustered:       _ => token(prec(1, make_keyword("clustered"))),
    keyword_buckets:         _ => token(prec(1, make_keyword("buckets"))),
    keyword_msck:            _ => token(prec(1, make_keyword("msck"))),
    keyword_repair:          _ => token(prec(1, make_keyword("repair"))),
    keyword_sync:            _ => token(prec(1, make_keyword("sync"))),
    keyword_partitions:      _ => token(prec(1, make_keyword("partitions"))),
    keyword_cluster:         _ => token(prec(1, make_keyword("cluster"))),
    keyword_distribute:      _ => token(prec(1, make_keyword("distribute"))),
    keyword_bucket:          _ => token(prec(1, make_keyword("bucket"))),
    keyword_load:            _ => token(prec(1, make_keyword("load"))),
    keyword_inpath:          _ => token(prec(1, make_keyword("inpath"))),
    keyword_directory:       _ => token(prec(1, make_keyword("directory"))),
    keyword_oids:            _ => token(prec(1, make_keyword("oids"))),
    keyword_virtual:         _ => token(prec(1, make_keyword("virtual"))),
    keyword_jar:             _ => token(prec(1, make_keyword("jar"))),
    keyword_handler:         _ => token(prec(1, make_keyword("handler"))),
    keyword_environment:     _ => token(prec(1, make_keyword("environment"))),
    keyword_parameter:       _ => token(prec(1, make_keyword("parameter"))),
    keyword_style:           _ => token(prec(1, make_keyword("style"))),
    keyword_overwrite:       _ => token(prec(1, make_keyword("overwrite"))),
    keyword_transform:       _ => token(prec(1, make_keyword("transform"))),
    keyword_show:            _ => token(prec(1, make_keyword("show"))),
    keyword_describe:        _ => token(prec(1, make_keyword("describe"))),
    keyword_formatted:       _ => token(prec(1, make_keyword("formatted"))),
    keyword_extended:        _ => token(prec(1, make_keyword("extended"))),
    keyword_databases:       _ => token(prec(1, make_keyword("databases"))),
    keyword_schemas:         _ => token(prec(1, make_keyword("schemas"))),
    keyword_functions:       _ => token(prec(1, make_keyword("functions"))),
    keyword_exchange:        _ => token(prec(1, make_keyword("exchange"))),

    ...hive_storage_rules,
    ...hive_partition_rules,
    ...hive_lateral_view_rules,

  },
});
