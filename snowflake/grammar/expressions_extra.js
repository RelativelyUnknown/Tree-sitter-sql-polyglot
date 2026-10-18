import { comma_list, paren_list } from '../../grammar/helpers.js';

// Snowflake expression forms beyond ISO: semi-structured constants, typed lambda parameters,
// the ** spread operator, ILIKE, COLLATE, IGNORE / RESPECT NULLS, // comments.
export default {

  comment: _ => /(--|\/\/).*/,

  // [1, 2, 3]  and  []
  array_constant: $ => seq('[', optional(comma_list($._expression, true)), ']'),

  // {'k': v, ...}  and  {}
  object_constant: $ => seq(
    '{',
    optional(comma_list(seq(field('key', $._expression), ':', field('value', $._expression)), true)),
    '}',
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
