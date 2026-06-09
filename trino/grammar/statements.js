import { comma_list, paren_list } from '../../grammar/helpers.js';

export default {

  // PREPARE name FROM statement
  prepare_statement: $ => seq(
    $.keyword_prepare,
    field('name', $.identifier),
    $.keyword_from,
    $._dml_read,
  ),

  // EXECUTE name [USING expr, ...]
  execute_statement: $ => seq(
    $.keyword_execute,
    field('name', $.identifier),
    optional(seq(
      $.keyword_using,
      comma_list($._expression, true),
    )),
  ),

  // DEALLOCATE PREPARE name
  deallocate_statement: $ => seq(
    $.keyword_deallocate,
    $.keyword_prepare,
    field('name', $.identifier),
  ),

  // SHOW STATS FOR table_ref
  show_stats_statement: $ => seq(
    $.keyword_show,
    $.keyword_stats,
    $.keyword_for,
    $.object_reference,
  ),

  // SET SESSION property = value
  set_session_statement: $ => seq(
    $.keyword_set,
    $.keyword_session,
    field('property', $.object_reference),
    '=',
    field('value', $._expression),
  ),

  // RESET SESSION property
  reset_session_statement: $ => seq(
    $.keyword_reset,
    $.keyword_session,
    field('property', $.object_reference),
  ),

  // SHOW CATALOGS | SCHEMAS [FROM catalog] | TABLES [FROM schema] |
  //      COLUMNS FROM table | FUNCTIONS | GRANTS [ON table] |
  //      ROLES [FROM catalog] | SESSION
  //   [LIKE pattern]
  show_statement: $ => seq(
    $.keyword_show,
    choice(
      $.keyword_catalogs,
      seq($.keyword_schemas,   optional(seq($.keyword_from, $.object_reference))),
      seq($.keyword_tables,    optional(seq($.keyword_from, $.object_reference))),
      seq($.keyword_columns,   $.keyword_from, $.object_reference),
      seq($.keyword_functions, optional(seq($.keyword_from, $.object_reference))),
      seq($.keyword_grants,    optional(seq($.keyword_on, $.object_reference))),
      seq($.keyword_roles,     optional(seq($.keyword_from, $.object_reference))),
      $.keyword_session,
    ),
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  ),

  // DESCRIBE [EXTENDED] table  /  DESC table
  describe_statement: $ => seq(
    choice($.keyword_describe, $.keyword_desc),
    optional($.keyword_extended),
    $.object_reference,
  ),

  // ANALYZE table [WITH (k = v, ...)]
  analyze_statement: $ => seq(
    $.keyword_analyze,
    $.object_reference,
    optional(seq(
      $.keyword_with,
      '(',
      comma_list($.analyze_property, true),
      ')',
    )),
  ),

  // k = expr  (inside ANALYZE WITH)
  analyze_property: $ => seq($.identifier, '=', $._expression),

  // COMMENT ON TABLE|COLUMN name IS literal|NULL
  comment_on_statement: $ => seq(
    $.keyword_comment,
    $.keyword_on,
    choice($.keyword_table, $.keyword_column),
    $.object_reference,
    $.keyword_is,
    choice(alias($._literal_string, $.literal), $.keyword_null),
  ),

};
