import { comma_list, optional_parenthesis } from '../../grammar/helpers.js';

export default {

  // DECLARE @var1 type [= expr] [, @var2 type [= expr], ...]
  declare_statement: $ => seq(
    $.keyword_declare,
    comma_list($.variable_declaration, true),
  ),

  variable_declaration: $ => seq(
    $.variable,
    optional($.keyword_as),
    $._type,
    optional(seq(
      choice('=', $.keyword_default),
      $._expression,
    )),
  ),

  // IF condition compound_statement [ELSE compound_statement]
  if_statement: $ => prec.right(seq(
    $.keyword_if,
    optional_parenthesis($._expression),
    $.compound_statement,
    optional(seq(
      $.keyword_else,
      $.compound_statement,
    )),
  )),

  // WHILE condition compound_statement
  while_statement: $ => seq(
    $.keyword_while,
    optional_parenthesis($._expression),
    $.compound_statement,
  ),

  // BEGIN statement; [statement;]* END
  // Requires explicit BEGIN...END delimiters; bare single-statement bodies
  // cause irresolvable shift/reduce conflicts with the program-level rule.
  compound_statement: $ => seq(
    $.keyword_begin,
    repeat(seq($.statement, ';')),
    $.keyword_end,
  ),

  // BEGIN TRY statement; [statement;]* END TRY BEGIN CATCH ... END CATCH
  try_catch_statement: $ => seq(
    $.keyword_begin,
    $.keyword_try,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    $.keyword_try,
    $.keyword_begin,
    $.keyword_catch,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    $.keyword_catch,
  ),

  // RAISERROR ( { msg_id | msg_str }, severity, state [, arg [,...]] )
  // [WITH LOG | SETERROR | NOWAIT]
  raiserror_statement: $ => seq(
    $.keyword_raiserror,
    '(',
    $._expression,
    ',',
    $._expression,
    ',',
    $._expression,
    repeat(seq(',', $._expression)),
    ')',
    optional(seq(
      $.keyword_with,
      comma_list(choice(
        $.keyword_log,
        $.keyword_seterror,
        $.keyword_nowait,
      ), true),
    )),
  ),

  // THROW [ error_number , message , state ]
  throw_statement: $ => seq(
    $.keyword_throw,
    optional(seq(
      $._expression,
      ',',
      $._expression,
      ',',
      $._expression,
    )),
  ),

  // PRINT expression
  print_statement: $ => seq(
    $.keyword_print,
    $._expression,
  ),

  // DECLARE cursor_name [INSENSITIVE] [SCROLL] CURSOR
  //   [FOR | options] FOR select_statement
  declare_cursor_statement: $ => prec.left(seq(
    $.keyword_declare,
    field('name', $.identifier),
    repeat(choice(
      $.keyword_insensitive,
      $.keyword_scroll,
      $.keyword_local,
      $.keyword_global,
      $.keyword_forward_only,
      $.keyword_static,
      $.keyword_keyset,
      $.keyword_dynamic,
      $.keyword_fast_forward,
      $.keyword_read_only,
      $.keyword_scroll_locks,
      $.keyword_optimistic,
      $.keyword_type_warning,
    )),
    $.keyword_cursor,
    $.keyword_for,
    $._dml_read,
  )),

  // OPEN [GLOBAL] cursor_name
  open_cursor_statement: $ => seq(
    $.keyword_open,
    optional($.keyword_global),
    field('name', $.identifier),
  ),

  // FETCH [direction] [FROM] [GLOBAL] cursor_name [INTO @var, ...]
  fetch_cursor_statement: $ => seq(
    $.keyword_fetch,
    optional(choice(
      $.keyword_next,
      $.keyword_prior,
      $.keyword_first,
      $.keyword_last,
      seq($.keyword_absolute, $._expression),
      seq($.keyword_relative, $._expression),
    )),
    optional($.keyword_from),
    optional($.keyword_global),
    field('name', $.identifier),
    optional(seq($.keyword_into, comma_list($.variable, true))),
  ),

  // CLOSE [GLOBAL] cursor_name
  close_cursor_statement: $ => seq(
    $.keyword_close,
    optional($.keyword_global),
    field('name', $.identifier),
  ),

  // DEALLOCATE [GLOBAL] [CURSOR] cursor_name
  deallocate_cursor_statement: $ => seq(
    $.keyword_deallocate,
    optional($.keyword_global),
    optional($.keyword_cursor),
    field('name', $.identifier),
  ),

};
