import { comma_list } from '../../grammar/helpers.js';

export default {

  // [label:] BEGIN statement* END [label]
  // DECLARE statements appear as regular statements (must precede others semantically,
  // but the grammar does not enforce ordering)
  compound_statement: $ => seq(
    optional(seq(field('label', $.identifier), ':')),
    $.keyword_begin,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    optional(field('end_label', $.identifier)),
  ),

  // DECLARE var_name type [DEFAULT expr]
  declare_statement: $ => seq(
    $.keyword_declare,
    field('name', $.identifier),
    field('type', $._type),
    optional(seq($.keyword_default, field('default', $._expression))),
  ),

  // SET var = expr  (plain identifiers, qualified fields like NEW.col, @user_variables)
  set_variable_statement: $ => seq(
    $.keyword_set,
    choice(
      $.user_variable,
      alias($._qualified_field, $.field),
      $.identifier,
    ),
    '=',
    field('value', $._expression),
  ),

  // IF cond THEN ... [ELSEIF cond THEN ...] [ELSE ...] END IF
  if_statement: $ => seq(
    $.keyword_if,
    field('condition', $._expression),
    $.keyword_then,
    repeat(seq($.statement, ';')),
    repeat(seq(
      $.keyword_elseif,
      field('condition', $._expression),
      $.keyword_then,
      repeat(seq($.statement, ';')),
    )),
    optional(seq(
      $.keyword_else,
      repeat(seq($.statement, ';')),
    )),
    $.keyword_end,
    $.keyword_if,
  ),

  // WHILE cond DO ... END WHILE
  while_statement: $ => seq(
    $.keyword_while,
    field('condition', $._expression),
    $.keyword_do,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    $.keyword_while,
  ),

  // REPEAT ... UNTIL cond END REPEAT
  repeat_statement: $ => seq(
    $.keyword_repeat,
    repeat(seq($.statement, ';')),
    $.keyword_until,
    field('condition', $._expression),
    $.keyword_end,
    $.keyword_repeat,
  ),

  // [label:] LOOP ... END LOOP [label]
  loop_statement: $ => seq(
    optional(seq(field('label', $.identifier), ':')),
    $.keyword_loop,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    $.keyword_loop,
    optional(field('end_label', $.identifier)),
  ),

  // LEAVE label
  leave_statement: $ => seq(
    $.keyword_leave,
    field('label', $.identifier),
  ),

  // ITERATE label
  iterate_statement: $ => seq(
    $.keyword_iterate,
    field('label', $.identifier),
  ),

  // RETURN expr
  return_statement: $ => seq(
    $.keyword_return,
    $._expression,
  ),

  // CALL proc_name(args)
  call_statement: $ => seq(
    $.keyword_call,
    $.invocation,
  ),

  // SIGNAL SQLSTATE 'value' [SET MESSAGE_TEXT = 'msg']
  signal_statement: $ => prec.right(seq(
    $.keyword_signal,
    optional(seq(
      $.keyword_sqlstate,
      alias($._single_quote_string, $.literal),
    )),
    optional(seq(
      $.keyword_set,
      $.keyword_message_text,
      '=',
      alias($._single_quote_string, $.literal),
    )),
  )),

  // RESIGNAL [SQLSTATE 'value'] [SET MESSAGE_TEXT = 'msg']
  resignal_statement: $ => prec.right(seq(
    $.keyword_resignal,
    optional(seq(
      $.keyword_sqlstate,
      alias($._single_quote_string, $.literal),
    )),
    optional(seq(
      $.keyword_set,
      $.keyword_message_text,
      '=',
      alias($._single_quote_string, $.literal),
    )),
  )),

  // GET DIAGNOSTICS variable = RETURNED_SQLSTATE | MESSAGE_TEXT | CONDITION n
  get_diagnostics_statement: $ => seq(
    $.keyword_get,
    $.keyword_diagnostics,
    field('variable', $.identifier),
    '=',
    choice(
      $.keyword_returned_sqlstate,
      $.keyword_message_text,
      seq($.keyword_condition, field('condition_number', alias($._integer, $.literal))),
    ),
  ),

};
