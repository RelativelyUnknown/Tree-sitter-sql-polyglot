import { comma_list, paren_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

// Snowflake expression forms beyond ISO: semi-structured constants, typed lambda parameters,
// the ** spread operator, ILIKE, COLLATE, IGNORE / RESPECT NULLS, // comments.
export default {

  comment: _ => /(--|\/\/).*/,

  // [1, 2, 3]  and  []
  array_constant: $ => seq('[', optional(comma_list($._expression, true)), ']'),

  // {'k': v, ...}, {}, and {* [ILIKE ...] [EXCLUDE ...]} / {t.*}: every column as a key/value pair
  object_constant: $ => seq(
    '{',
    optional(choice(
      comma_list(seq(field('key', $._expression), ':', field('value', $._expression)), true),
      $.all_fields_transform,
      $.all_fields,
    )),
    '}',
  ),

  // a INT -> a * 2   and   (acc INT, val INT) -> acc + val
  // Untyped lambdas (a -> a * 2) parse as ordinary binary expressions.
  lambda_expression: $ => prec.right(seq(
    choice($.lambda_parameter, paren_list($.lambda_parameter, true)),
    '->',
    field('body', $._expression),
  )),

  lambda_parameter: $ => seq(field('name', $.identifier), $._lambda_type),

  // Built-in types only: a custom type name would start like a select-list alias and make
  // `SELECT a b` ambiguous with a parameter.
  _lambda_type: $ => choice(
    $.keyword_boolean,
    $.smallint, $.int, $.bigint, $.decimal, $.numeric, $.double, $.float,
    $.char, $.varchar,
    $.keyword_date, $.time, $.timestamp,
  ),

  // INTERVAL '5' YEAR(2) [TO MONTH]   with optional leading / fractional precision
  interval: $ => prec.right(seq(
    $.keyword_interval,
    $._literal_string,
    optional(seq(field('qualifier', $.identifier), optional($._interval_precision))),
    optional(seq($.keyword_to, field('end_qualifier', $.identifier), optional($._interval_precision))),
  )),

  _interval_precision: $ => seq('(', alias($._integer, $.literal), optional(seq(',', alias($._integer, $.literal))), ')'),

  // CAST and TRY_CAST ( <expr> AS <type> )
  cast: $ => seq(
    field('name', choice($.keyword_cast, $.keyword_try_cast)),
    wrapped_in_parenthesis(
      seq(
        field('parameter', $._expression),
        $.keyword_as,
        $._type,
      ),
    ),
  ),

  // ** [1, 2]: expands an array into function arguments or an IN list
  spread_expression: $ => prec.right(seq('**', $._expression)),

  collate_expression: $ => prec.left('pattern_matching', seq(
    field('value', $._expression),
    $.keyword_collate,
    field('collation', choice(alias($._literal_string, $.literal), $.identifier)),
  )),

  like_expression: $ => prec.left('pattern_matching', seq(
    field('left', $._expression),
    field('operator', choice($.keyword_like, $.keyword_ilike, $.not_like, seq($.keyword_not, $.keyword_ilike))),
    field('right', $._expression),
    optional(seq($.keyword_escape, field('escape', $._expression))),
  )),

  // fn(...) [IGNORE | RESPECT NULLS] OVER (...)
  window_function: $ => seq(
    $.invocation,
    optional(seq(choice($.keyword_ignore, $.keyword_respect), $.keyword_nulls)),
    $.keyword_over,
    choice(
      $.identifier,
      $.window_specification,
    ),
  ),

};
