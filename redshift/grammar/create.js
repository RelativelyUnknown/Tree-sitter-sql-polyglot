import { paren_list } from '../../grammar/helpers.js';

export default {

  // Override _column_constraint to add DISTKEY, SORTKEY, ENCODE
  _column_constraint: $ => prec.left(choice(
    choice($.keyword_null, $._not_null),
    seq(
      $.keyword_references,
      $.object_reference,
      paren_list($.identifier, true),
      repeat(
        seq(
          $.keyword_on,
          choice($.keyword_delete, $.keyword_update),
          choice(
            seq($.keyword_no, $.keyword_action),
            $.keyword_restrict,
            $.keyword_cascade,
            seq(
              $.keyword_set,
              choice($.keyword_null, $.keyword_default),
              optional(paren_list($.identifier, true)),
            ),
          ),
        ),
      ),
    ),
    $._default_expression,
    $._primary_key,
    $.direction,
    $._column_comment,
    $._check_constraint,
    seq(
      optional(seq($.keyword_generated, $.keyword_always)),
      $.keyword_as,
      $._expression,
    ),
    $.keyword_unique,
    // Redshift-specific column-level constraints
    $.keyword_distkey,
    $.keyword_sortkey,
    seq($.keyword_encode, field('encoding', $.identifier)),
  )),

  // Override create_table to add Redshift distribution/sort options
  create_table: $ => prec.left(seq(
    $.keyword_create,
    optional($._temporary),
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    seq(
      optional($.column_definitions),
      optional(seq($.keyword_as, $.create_query)),
    ),
    optional($._redshift_diststyle),
    optional($._redshift_distkey),
    optional($._redshift_sortkey),
  )),

  // DISTSTYLE KEY | EVEN | ALL | AUTO
  _redshift_diststyle: $ => seq(
    $.keyword_diststyle,
    choice(
      $.keyword_key,
      $.keyword_even,
      $.keyword_all,
      $.keyword_auto,
    ),
  ),

  // DISTKEY(col)
  _redshift_distkey: $ => seq(
    $.keyword_distkey,
    paren_list($.identifier, true),
  ),

  // [COMPOUND | INTERLEAVED] SORTKEY(cols)
  _redshift_sortkey: $ => seq(
    optional(choice($.keyword_compound, $.keyword_interleaved)),
    $.keyword_sortkey,
    paren_list($.identifier, true),
  ),

  // Override _create_statement to add Redshift-specific CREATE variants
  _create_statement: $ => seq(
    choice(
      $.create_table,
      $.create_view,
      $.create_materialized_view,
      $.create_index,
      $.create_function,
      $.create_procedure,
      $.create_type,
      $.create_database,
      $.create_role,
      $.create_sequence,
      $.create_trigger,
      $.create_external_schema,
      $.create_external_table,
      prec.left(seq(
        $.create_schema,
        repeat($._create_statement),
      )),
    ),
  ),

  // CREATE EXTERNAL SCHEMA [IF NOT EXISTS] name
  //   FROM DATA CATALOG
  //   DATABASE 'db'
  //   IAM_ROLE 'arn:...'
  //   [CREATE EXTERNAL DATABASE IF NOT EXISTS]
  create_external_schema: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_external,
    $.keyword_schema,
    optional($._if_not_exists),
    $.identifier,
    $.keyword_from,
    $.keyword_data,
    $.keyword_catalog,
    $.keyword_database,
    alias($._literal_string, $.literal),
    $.keyword_iam_role,
    alias($._literal_string, $.literal),
    optional(seq(
      $.keyword_create,
      $.keyword_external,
      $.keyword_database,
      $._if_not_exists,
    )),
  )),

  // CREATE EXTERNAL TABLE [IF NOT EXISTS] ref (cols)
  //   [PARTITIONED BY (col type, ...)]
  //   [ROW FORMAT DELIMITED [FIELDS TERMINATED BY 'x']]
  //   STORED AS format
  //   LOCATION 's3://...'
  create_external_table: $ => seq(
    $.keyword_create,
    $.keyword_external,
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    $.column_definitions,
    optional(seq(
      $.keyword_partitioned, $.keyword_by,
      paren_list($.column_definition, true),
    )),
    optional(seq(
      $.keyword_row, $.keyword_format,
      $.keyword_delimited,
      optional(seq(
        $.keyword_fields, $.keyword_terminated, $.keyword_by,
        alias($._literal_string, $.literal),
      )),
    )),
    seq($.keyword_stored, $.keyword_as, $.identifier),
    seq($.keyword_location, alias($._literal_string, $.literal)),
  ),

  // Override _alter_specifications to add Redshift external table partition ops
  _alter_specifications: $ => choice(
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
    // ADD PARTITION (key=val, ...) LOCATION '...'
    seq(
      $.keyword_add, $.keyword_partition,
      paren_list(seq($.identifier, '=', $._expression), true),
      $.keyword_location, alias($._literal_string, $.literal),
    ),
    // DROP PARTITION (key=val, ...)
    seq(
      $.keyword_drop, $.keyword_partition,
      paren_list(seq($.identifier, '=', $._expression), true),
    ),
  ),

};
