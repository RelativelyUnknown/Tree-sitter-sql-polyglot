import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// Oracle SELECT clauses the ANSI base leaves out (Oracle SQL Language Reference 26ai): SEARCH / CYCLE and
// a VALUES body on each subquery factoring clause, and row limiting with expressions, PERCENT, APPROX /
// EXACT and TARGET ACCURACY, QUALIFY, and multiple named windows.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_approx:      _ => kw('approx'),
  keyword_approximate: _ => kw('approximate'),
  keyword_breadth:     _ => kw('breadth'),
  keyword_depth:       _ => kw('depth'),
  keyword_efsearch:    _ => kw('efsearch'),
  keyword_exact:       _ => kw('exact'),
  keyword_probes:      _ => kw('probes'),
  keyword_qualify:     _ => kw('qualify'),
  keyword_search:      _ => kw('search'),

  // QUALIFY condition: filters rows after window functions are evaluated
  qualify: $ => seq(
    $.keyword_qualify,
    field('predicate', $._expression),
  ),

  // WINDOW w1 AS (…) [, w2 AS (…)]
  window_clause: $ => seq(
    $.keyword_window,
    comma_list(seq($.identifier, $.keyword_as, $.window_specification), true),
  ),

  // ( [existing_window] [PARTITION BY …] [ORDER BY …] [frame] )
  window_specification: $ => wrapped_in_parenthesis(
    seq(
      optional($.identifier),
      optional($.partition_by),
      optional($.order_by),
      optional($.window_frame),
    ),
  ),

  // name [(cols)] AS [[NOT] MATERIALIZED] (query | VALUES …) [SEARCH …] [CYCLE …]
  cte: $ => seq(
    field('name', $.identifier),
    optional(paren_list(field('argument', $.identifier))),
    $.keyword_as,
    optional(seq(optional($.keyword_not), $.keyword_materialized)),
    wrapped_in_parenthesis(
      choice(
        alias(choice($._dml_read, $._dml_write), $.statement),
        $.values,
      ),
    ),
    optional($.search_clause),
    optional($.cycle_clause),
  ),

  // SEARCH {BREADTH | DEPTH} FIRST BY col [ASC | DESC] [NULLS FIRST | LAST] [, …] SET ordering_column
  search_clause: $ => seq(
    $.keyword_search,
    choice($.keyword_breadth, $.keyword_depth),
    $.keyword_first,
    $.keyword_by,
    comma_list(seq(
      $.identifier,
      optional(choice($.keyword_asc, $.keyword_desc)),
      optional(seq($.keyword_nulls, choice($.keyword_first, $.keyword_last))),
    ), true),
    $.keyword_set,
    field('ordering_column', $.identifier),
  ),

  // CYCLE col [, …] SET cycle_mark_column TO mark_value DEFAULT no_cycle_value
  cycle_clause: $ => seq(
    $.keyword_cycle,
    comma_list($.identifier, true),
    $.keyword_set,
    field('mark_column', $.identifier),
    $.keyword_to,
    $._expression,
    $.keyword_default,
    $._expression,
  ),

  // [OFFSET n {ROW | ROWS}] [FETCH [APPROX | APPROXIMATE | EXACT] {FIRST | NEXT} [n [PERCENT]] {ROW | ROWS}
  //   {ONLY | WITH TIES} [WITH TARGET ACCURACY …]]
  offset_fetch_clause: $ => prec.right(choice(
    seq(
      $.keyword_offset,
      $._expression,
      choice($.keyword_row, $.keyword_rows),
      optional($._fetch_first_clause),
    ),
    $._fetch_first_clause,
  )),

  _fetch_first_clause: $ => seq(
    $.keyword_fetch,
    optional(choice($.keyword_approx, $.keyword_approximate, $.keyword_exact)),
    choice($.keyword_first, $.keyword_next),
    optional(seq($._expression, optional($.keyword_percent))),
    choice($.keyword_row, $.keyword_rows),
    choice($.keyword_only, seq($.keyword_with, $.keyword_ties)),
    optional($._target_accuracy),
  ),

  // WITH TARGET ACCURACY [n] [PARAMETERS (EFSEARCH n | NEIGHBOR PARTITION PROBES n …)]
  _target_accuracy: $ => seq(
    $.keyword_with, $.keyword_target, $.keyword_accuracy,
    choice(
      seq($._expression, optional($._accuracy_parameters)),
      $._accuracy_parameters,
    ),
  ),

  _accuracy_parameters: $ => seq(
    $.keyword_parameters,
    '(',
    repeat1(choice(
      seq($.keyword_efsearch, $._expression),
      seq($.keyword_neighbor, $.keyword_partition, $.keyword_probes, $._expression),
    )),
    ')',
  ),

};
