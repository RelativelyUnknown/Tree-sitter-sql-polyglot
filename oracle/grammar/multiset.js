import { make_keyword } from '../../grammar/helpers.js';

// Nested table conditions and operators (Oracle SQL Language Reference 26ai): IS [NOT] A SET, [NOT] MEMBER [OF],
// [NOT] SUBMULTISET [OF], and the set operators a MULTISET {UNION | INTERSECT | EXCEPT} [ALL | DISTINCT] b.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_a:            _ => kw('a'),
  keyword_submultiset:  _ => kw('submultiset'),

  // expr IS [NOT] A SET, at the precedence of the other IS conditions
  is_a_set_condition: $ => prec.left('binary_is', seq(
    field('left', $._expression),
    choice($.keyword_is, $.is_not),
    $.keyword_a,
    $.keyword_set,
  )),

  multiset_condition: $ => prec.left('binary_relation', seq(
    field('left', $._expression),
    optional($.keyword_not),
    choice($.keyword_member, $.keyword_submultiset),
    optional($.keyword_of),
    field('right', $._expression),
  )),

  multiset_operation: $ => prec.left('binary_other', seq(
    field('left', $._expression),
    $.keyword_multiset,
    choice($.keyword_union, $.keyword_intersect, $.keyword_except),
    optional(choice($.keyword_all, $.keyword_distinct)),
    field('right', $._expression),
  )),

};
