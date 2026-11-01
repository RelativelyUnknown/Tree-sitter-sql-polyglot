// Ordered optional sequences without the combinatorial blow-up.
//
// tree-sitter flattens `seq(optional(a), optional(b), … )` into one production per combination, so a
// run of n optional items costs 2^n productions in the parse table generator. Writing the same
// language as a chain of hidden rules costs about 3n:
//
//   _x_0: choice(seq(a, optional(_x_1)), _x_1)
//   _x_1: choice(seq(b, optional(_x_2)), _x_2)
//   _x_2: c
//
// The language and the resulting trees are identical (the chain rules are hidden). The seq is prec.right,
// so an item that could also continue the enclosing rule is shifted, as it was in the flat form. Use it for a run
// of optional items that must keep its order; for order-insensitive lists prefer repeat(choice(…)).
//
//   ...ordered_optionals('_from_clauses', [$ => $.where, $ => $.group_by])
//   from: $ => seq($.keyword_from, …, optional($._from_clauses_0))
export function ordered_optionals(prefix, items) {
  const rules = {};
  const last = items.length - 1;
  for (let i = last; i >= 0; i--) {
    const next = i < last ? `${prefix}_${i + 1}` : null;
    rules[`${prefix}_${i}`] = $ => next
      ? choice(prec.right(seq(items[i]($), optional($[next]))), $[next])
      : items[i]($);
  }
  return rules;
}
