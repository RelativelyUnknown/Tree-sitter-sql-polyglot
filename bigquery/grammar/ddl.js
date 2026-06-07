import { comma_list, paren_list, optional_parenthesis } from '../../grammar/helpers.js';

export default {

  // Override: CREATE SCHEMA [IF NOT EXISTS] dataset_name [OPTIONS (...)]
  create_schema: $ => seq(
    $.keyword_create,
    $.keyword_schema,
    optional($._if_not_exists),
    $.object_reference,
    optional($.options_clause),
  ),

  // Override: ALTER SCHEMA [IF EXISTS] dataset_name SET OPTIONS (...)
  alter_schema: $ => seq(
    $.keyword_alter,
    $.keyword_schema,
    optional($._if_exists),
    $.object_reference,
    $.keyword_set,
    $.options_clause,
  ),

  // Override: DROP SCHEMA [IF EXISTS] dataset_name [CASCADE | RESTRICT]
  drop_schema: $ => seq(
    $.keyword_drop,
    $.keyword_schema,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  // CALL procedure_name([arg, ...])
  call_statement: $ => seq(
    $.keyword_call,
    $.object_reference,
    '(',
    optional(comma_list($._expression, true)),
    ')',
  ),

  // Override when_clause to add WHEN NOT MATCHED BY SOURCE (BQ/SQL Server extension)
  when_clause: $ => prec.left(seq(
    $.keyword_when,
    optional($.keyword_not),
    $.keyword_matched,
    optional(seq(
      $.keyword_by,
      $.keyword_source,
    )),
    optional(
      seq(
        $.keyword_and,
        optional_parenthesis(field('predicate', $._expression))
      )
    ),
    $.keyword_then,
    choice(
      $.keyword_delete,
      seq(
        $.keyword_update,
        $._set_values,
      ),
      seq(
        $.keyword_insert,
        $._insert_values
      ),
      optional($.where)
    )
  )),


  // OPTIONS (key = value, ...)
  options_clause: $ => seq(
    $.keyword_options,
    '(',
    comma_list(
      seq(field('key', $.identifier), '=', field('value', $._expression)),
      true,
    ),
    ')',
  ),

  // Override: CREATE [TEMP] TABLE ... [column_defs] [OPTIONS (...)] [AS query]
  create_table: $ => prec.left(
    seq(
      $.keyword_create,
      optional(
        choice(
          $._temporary,
          $.keyword_unlogged,
          $.keyword_external,
        ),
      ),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      seq(
        optional($.column_definitions),
        optional($.options_clause),
        optional(seq($.keyword_as, $.create_query)),
      ),
    ),
  ),

  // Override: CREATE [OR REPLACE] [TEMP] VIEW ... [OPTIONS (...)] AS query
  create_view: $ => prec.right(
    seq(
      $.keyword_create,
      optional($._or_replace),
      optional($._temporary),
      optional($.keyword_recursive),
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional(paren_list($.identifier)),
      optional($.options_clause),
      $.keyword_as,
      $.create_query,
    ),
  ),

  // CREATE [OR REPLACE] MODEL [IF NOT EXISTS] ref [OPTIONS (...)] AS query
  create_model: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_model,
    optional($._if_not_exists),
    $.object_reference,
    optional($.options_clause),
    $.keyword_as,
    $.create_query,
  ),

  // EXPORT DATA [WITH CONNECTION ref] [OPTIONS (...)] AS query
  export_data: $ => seq(
    $.keyword_export,
    $.keyword_data,
    optional(seq($.keyword_with, $.keyword_connection, $.object_reference)),
    optional($.options_clause),
    $.keyword_as,
    $.create_query,
  ),

  // ASSERT expr [AS 'message']
  assert_statement: $ => seq(
    $.keyword_assert,
    field('condition', $._expression),
    optional(seq($.keyword_as, alias($._literal_string, $.literal))),
  ),

};
