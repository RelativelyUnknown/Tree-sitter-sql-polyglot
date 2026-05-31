import { comma_list } from '../../grammar/helpers.js';

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

};
