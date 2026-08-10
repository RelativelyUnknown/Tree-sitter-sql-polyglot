import { paren_list, comma_list } from '../../grammar/helpers.js';

export default {

  // CREATE [OR REPLACE] STREAM [IF NOT EXISTS] name ON TABLE table_name
  create_stream: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_stream,
    optional($._if_not_exists),
    $.object_reference,
    $.keyword_on,
    $.keyword_table,
    $.object_reference,
  ),

  // CREATE [OR REPLACE] TASK [IF NOT EXISTS] name
  //   SCHEDULE = 'cron_expr'
  //   [WAREHOUSE = wh_name]
  //   AS query
  create_task: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_task,
    optional($._if_not_exists),
    $.object_reference,
    $.keyword_schedule,
    '=',
    alias($._literal_string, $.literal),
    optional(seq($.keyword_warehouse, '=', $.identifier)),
    repeat($.task_property),
    $.keyword_as,
    $._dml_read,
  ),

  task_property: $ => seq(
    $.identifier,
    '=',
    choice(
      alias($._literal_string, $.literal),
      $.identifier,
    ),
  ),

  // CREATE [OR REPLACE] DYNAMIC TABLE [IF NOT EXISTS] name
  //   TARGET_LAG = 'lag_interval'
  //   WAREHOUSE = wh_name
  //   AS query
  create_dynamic_table: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_dynamic,
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    $.keyword_target_lag,
    '=',
    alias($._literal_string, $.literal),
    $.keyword_warehouse,
    '=',
    $.identifier,
    repeat($.snowflake_property),
    $.keyword_as,
    $._dml_read,
  ),

  // CREATE [OR REPLACE] SECURE VIEW [IF NOT EXISTS] name AS query
  create_secure_view: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_secure,
    $.keyword_view,
    optional($._if_not_exists),
    $.object_reference,
    optional(paren_list($.identifier)),
    $.keyword_as,
    $.create_query,
  ),

  // CREATE [OR REPLACE] MASKING POLICY [IF NOT EXISTS] name
  //   AS (param TYPE [, ...]) RETURNS return_type -> body_expr
  create_masking_policy: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_masking,
    $.keyword_policy,
    optional($._if_not_exists),
    $.object_reference,
    $.keyword_as,
    paren_list($.policy_param, true),
    $.keyword_returns,
    $._type,
    '->',
    $._expression,
  ),

  // CREATE [OR REPLACE] ROW ACCESS POLICY [IF NOT EXISTS] name
  //   AS (param TYPE [, ...]) RETURNS BOOLEAN -> body_expr
  create_row_access_policy: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_row,
    $.keyword_access,
    $.keyword_policy,
    optional($._if_not_exists),
    $.object_reference,
    $.keyword_as,
    paren_list($.policy_param, true),
    $.keyword_returns,
    $.keyword_boolean,
    '->',
    $._expression,
  ),

  // param_name TYPE  (used in MASKING POLICY / ROW ACCESS POLICY signatures)
  policy_param: $ => seq($.identifier, $._type),

  // CREATE [OR REPLACE] FILE FORMAT [IF NOT EXISTS] name [TYPE = id] [prop = value ...]
  create_file_format_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_file,
    $.keyword_format,
    optional($._if_not_exists),
    $.object_reference,
    repeat($.file_format_property),
  ),

  // identifier = (literal | identifier | number | (list))
  file_format_property: $ => seq(
    $.identifier,
    '=',
    choice(
      $.literal,
      $.identifier,
      seq('(', repeat(seq(
        choice($.literal, $.identifier),
        optional(','),
      )), ')'),
    ),
  ),

  // CLONE source_object [AT / BEFORE time_travel]
  clone_clause: $ => seq(
    $.keyword_clone,
    $.object_reference,
    optional($.time_travel_clause),
  ),

  // UNDROP TABLE|SCHEMA|DATABASE name
  undrop_statement: $ => seq(
    $.keyword_undrop,
    choice($.keyword_table, $.keyword_schema, $.keyword_database),
    $.object_reference,
  ),

  // CREATE [OR REPLACE] WAREHOUSE [IF NOT EXISTS] name [properties]
  create_warehouse_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_warehouse,
    optional($._if_not_exists),
    $.object_reference,
    optional($.warehouse_properties),
  ),

  warehouse_properties: $ => repeat1(
    choice(
      seq($.keyword_warehouse_size, '=', $.identifier),
      seq($.keyword_max_cluster_count, '=', $._expression),
      seq($.keyword_min_cluster_count, '=', $._expression),
      seq($.keyword_scaling_policy, '=', choice($.keyword_standard, $.keyword_economy)),
      seq($.keyword_auto_suspend, '=', $._expression),
      seq($.keyword_auto_resume, '=', choice($.keyword_true, $.keyword_false)),
      seq($.keyword_comment, '=', alias($._literal_string, $.literal)),
      // Fallback for the properties the reference adds between releases.
      $.snowflake_property,
    ),
  ),

  // CREATE [OR REPLACE] EXTERNAL TABLE [IF NOT EXISTS] name (columns)
  //   [WITH] LOCATION = @stage [FILE_FORMAT = (props)] [PATTERN = 'regex']
  //   [PARTITION BY (cols)]
  create_external_table: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_external,
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    optional(paren_list($.external_table_column, true)),
    repeat(
      choice(
        seq(optional($.keyword_with), $.keyword_location, '=', $.stage_ref),
        seq(
          $.keyword_file_format,
          '=',
          seq('(', repeat1($.file_format_property), ')'),
        ),
        seq($.keyword_pattern, '=', alias($._literal_string, $.literal)),
        seq($.keyword_partition, $.keyword_by, paren_list($.identifier, true)),
      ),
    ),
  )),

  // col TYPE [AS (expr)]; external table virtual column projection
  external_table_column: $ => seq(
    field('name', $.identifier),
    field('type', $._type),
    optional(
      seq(
        $.keyword_as,
        seq('(', $._expression, ')'),
      ),
    ),
  ),

};
