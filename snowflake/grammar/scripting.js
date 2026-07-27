export default {

  // DECLARE section (top-level, before a BEGIN block)
  // DECLARE
  //   var1 TYPE [DEFAULT expr];
  //   var2 TYPE [DEFAULT expr];
  declare_block: $ => seq(
    $.keyword_declare,
    repeat1(seq($.variable_declaration, ';')),
  ),

  variable_declaration: $ => seq(
    $.identifier,
    optional($._type),
    optional(seq($.keyword_default, $._expression)),
  ),

  // BEGIN
  //   statements;
  //   [EXCEPTION WHEN condition THEN statements;]
  // END
  compound_statement: $ => seq(
    $.keyword_begin,
    repeat(seq($.statement, ';')),
    optional($.exception_clause),
    $.keyword_end,
  ),

  // EXCEPTION WHEN condition THEN statement; [WHEN ...]
  exception_clause: $ => seq(
    $.keyword_exception,
    repeat1($.when_handler),
  ),

  when_handler: $ => seq(
    $.keyword_when,
    $.identifier,
    $.keyword_then,
    repeat(seq($.statement, ';')),
  ),

  // LET var [TYPE] := expr
  let_statement: $ => seq(
    $.keyword_let,
    $.identifier,
    optional($._type),
    ':=',
    $._expression,
  ),

  // FOR var IN start TO end DO statements; END FOR
  // FOR var IN (query) DO statements; END FOR
  for_statement: $ => seq(
    $.keyword_for,
    field('variable', $.identifier),
    $.keyword_in,
    choice(
      seq($._expression, $.keyword_to, $._expression),
      $._dml_read,
    ),
    $.keyword_do,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    $.keyword_for,
  ),

  // RAISE [exception_name]
  raise_statement: $ => seq(
    $.keyword_raise,
    optional($.identifier),
  ),

  // RETURN [expr]
  return_statement: $ => seq(
    $.keyword_return,
    optional($._expression),
  ),

};
