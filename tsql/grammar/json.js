import { comma_list } from '../../grammar/helpers.js';

export default {

  // OPENJSON(expr [, 'path']) [WITH (col_def [, ...])]
  // Parsed as an invocation for the function call itself; this rule handles
  // the optional WITH schema clause when OPENJSON is used as a rowset provider.
  openjson_with_clause: $ => seq(
    $.keyword_with,
    '(',
    comma_list($.openjson_column_def, true),
    ')',
  ),

  // col_name type ['json_path'] [AS JSON]
  openjson_column_def: $ => seq(
    field('name', $.identifier),
    field('type', $._type),
    optional(field('path', alias($._literal_string, $.literal))),
    optional(seq($.keyword_as, $.keyword_json)),
  ),

  // OPENJSON(...) WITH (...) as a table-valued expression in FROM
  openjson_relation: $ => seq(
    $.keyword_openjson,
    '(',
    $._expression,
    optional(seq(',', alias($._literal_string, $.literal))),
    ')',
    optional($.openjson_with_clause),
  ),

};
