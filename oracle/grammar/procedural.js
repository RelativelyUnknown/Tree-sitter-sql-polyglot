import { comma_list } from '../../grammar/helpers.js';

export default {

  // NULL (no-op statement)
  null_statement: $ => $.keyword_null,

  // PRAGMA identifier [(args)]   -- generic: covers EXCEPTION_INIT, AUTONOMOUS_TRANSACTION, etc.
  pragma_statement: $ => seq(
    $.keyword_pragma,
    $.identifier,
    optional(seq('(', comma_list($._expression, true), ')')),
  ),

  // PIPE ROW (expr)
  pipe_row_statement: $ => seq(
    $.keyword_pipe,
    $.keyword_row,
    '(',
    $._expression,
    ')',
  ),

};
