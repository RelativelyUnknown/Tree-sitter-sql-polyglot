import { comma_list, paren_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

export default {

  // Package spec items: variable declarations, procedure/function forward
  // declarations, cursor declarations, exception declarations, and pragmas.
  _package_spec_item: $ => $._declaration,

  // Package body items are the same declarations, including full subprogram definitions.
  _package_body_item: $ => $._declaration,

  // name EXCEPTION;
  package_exception_declaration: $ => seq(
    field('name', $.identifier),
    $.keyword_exception,
    ';',
  ),

  // PROCEDURE name [(params)]; or FUNCTION name [(params)] RETURN type;
  package_subprogram_declaration: $ => seq(
    choice(
      seq(
        $.keyword_procedure,
        field('name', $.identifier),
        optional(paren_list($.function_argument, true)),
      ),
      seq(
        $.keyword_function,
        field('name', $.identifier),
        optional(paren_list($.function_argument, true)),
        $.keyword_return,
        field('return_type', $._type),
      ),
    ),
    ';',
  ),

  // PROCEDURE name [(params)] IS|AS ... BEGIN ... END [name];
  // FUNCTION name [(params)] RETURN type IS|AS ... BEGIN ... END [name];
  package_subprogram_body: $ => seq(
    choice(
      seq(
        $.keyword_procedure,
        field('name', $.identifier),
        optional(paren_list($.function_argument, true)),
      ),
      seq(
        $.keyword_function,
        field('name', $.identifier),
        optional(paren_list($.function_argument, true)),
        $.keyword_return,
        field('return_type', $._type),
      ),
    ),
    choice($.keyword_is, $.keyword_as),
    repeat($.variable_declaration),
    $.keyword_begin,
    repeat(seq($.statement, ';')),
    optional(seq(
      $.keyword_exception,
      repeat1($.exception_handler),
    )),
    $.keyword_end,
    optional(field('end_name', $.identifier)),
    ';',
  ),

  // PRAGMA name [(args)]; ; most common: PRAGMA EXCEPTION_INIT
  package_pragma: $ => seq(
    $.keyword_pragma,
    $.identifier,
    optional(paren_list($._expression, true)),
    ';',
  ),

};
