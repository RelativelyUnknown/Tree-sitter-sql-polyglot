import { comma_list, paren_list, optional_parenthesis, wrapped_in_parenthesis } from '../../grammar/helpers.js';

export default {

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

  // Override: CREATE [TEMP] TABLE ... [column_defs] [PARTITION BY] [CLUSTER BY] [OPTIONS (...)] [AS query]
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
        optional($.bq_partition_by),
        optional($.bq_cluster_by),
        optional($.options_clause),
        optional(seq($.keyword_as, $.create_query)),
      ),
    ),
  ),

  // PARTITION BY expr
  bq_partition_by: $ => seq(
    $.keyword_partition,
    $.keyword_by,
    $._expression,
  ),

  // CLUSTER BY col1 [, col2, ...]
  bq_cluster_by: $ => seq(
    $.keyword_cluster,
    $.keyword_by,
    comma_list($.identifier, true),
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
