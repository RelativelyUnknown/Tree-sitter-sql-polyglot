import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// Oracle SELECT clauses the ANSI base leaves out (Oracle SQL Language Reference 26ai): row limiting with
// expressions, PERCENT, APPROX / EXACT and TARGET ACCURACY, QUALIFY, multiple named windows, subquery factoring
// with SEARCH / CYCLE / VALUES, and PL/SQL declarations in WITH.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_approx:      _ => kw('approx'),
  keyword_approximate: _ => kw('approximate'),
  keyword_breadth:     _ => kw('breadth'),
  keyword_depth:       _ => kw('depth'),
  keyword_efsearch:    _ => kw('efsearch'),
  keyword_exact:       _ => kw('exact'),
  keyword_minus:       _ => kw('minus'),
  keyword_probes:      _ => kw('probes'),
  keyword_qualify:     _ => kw('qualify'),
  keyword_respect:     _ => kw('respect'),
  keyword_search:      _ => kw('search'),
  keyword_connect_by_root: _ => kw('connect_by_root'),

  // query { UNION | INTERSECT | MINUS | EXCEPT } [ALL | DISTINCT] query …
  set_operation: $ => seq(
    $._select_statement,
    repeat1(
      seq(
        field(
          "operation",
          seq(
            choice($.keyword_union, $.keyword_except, $.keyword_intersect, $.keyword_minus),
            optional(choice($.keyword_all, $.keyword_distinct)),
            optional(seq($.keyword_corresponding, optional(seq($.keyword_by, paren_list($.identifier, true))))),
          ),
        ),
        $._select_statement,
      ),
    ),
  ),

  // GROUP BY ALL groups by every non-aggregated item of the select list
  group_by: $ => prec.left(seq(
    $.keyword_group,
    $.keyword_by,
    choice(
      $.keyword_all,
      comma_list(choice(
        $._expression,
        $.rollup_clause,
        $.cube_clause,
        $.grouping_sets_clause,
      ), true),
    ),
  )),

  // GROUP BY and HAVING may come in either order
  _group_having: $ => choice(
    seq($.group_by, optional($.having)),
    seq($.having, optional($.group_by)),
  ),

  // START WITH may precede or follow CONNECT BY
  connect_by_clause: $ => choice(
    seq($._start_with, $._connect_by),
    seq($._connect_by, optional($._start_with)),
  ),

  _start_with: $ => seq(
    $.keyword_start,
    $.keyword_with,
    field('start_condition', $._expression),
  ),

  _connect_by: $ => seq(
    $.keyword_connect,
    $.keyword_by,
    optional($.keyword_nocycle),
    field('condition', $._expression),
  ),

  // WITH [FUNCTION / PROCEDURE declarations] [RECURSIVE] cte [, cte …]; the declarations end with ';'
  _cte: $ => seq(
    $.keyword_with,
    choice(
      seq(
        repeat1($.subprogram_definition),
        optional($._cte_list),
      ),
      $._cte_list,
    ),
  ),

  _cte_list: $ => seq(
    optional($.keyword_recursive),
    $.cte,
    repeat(seq(',', $.cte)),
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

  // {RESPECT | IGNORE} NULLS on a call argument or between the call and OVER
  _nulls_treatment: $ => seq(choice($.keyword_respect, $.keyword_ignore), $.keyword_nulls),

  window_function: $ => seq(
    $.invocation,
    optional($._nulls_treatment),
    $.keyword_over,
    choice(
      $.identifier,
      $.window_specification,
    ),
  ),

  // A frame bound is a number, a name, an expression or an INTERVAL (RANGE BETWEEN INTERVAL '30' DAY PRECEDING …)
  frame_definition: $ => seq(
    choice(
      seq($.keyword_unbounded, $.keyword_preceding),
      seq(
        field('start', choice(
          $.identifier,
          $.binary_expression,
          $.interval,
          alias($._literal_string, $.literal),
          alias($._integer, $.literal),
        )),
        $.keyword_preceding,
      ),
      $._current_row,
      seq(
        field('end', choice(
          $.identifier,
          $.binary_expression,
          $.interval,
          alias($._literal_string, $.literal),
          alias($._integer, $.literal),
        )),
        $.keyword_following,
      ),
      seq($.keyword_unbounded, $.keyword_following),
    ),
  ),

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
