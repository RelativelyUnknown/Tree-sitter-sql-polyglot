import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_running:   _ => kw('running'),
  keyword_permute:   _ => kw('permute'),
  keyword_subset:    _ => kw('subset'),
  keyword_unmatched: _ => kw('unmatched'),
  keyword_show:      _ => kw('show'),
  keyword_matches:   _ => kw('matches'),

  // MATCH_RECOGNIZE (
  //   [PARTITION BY ...]  [ORDER BY ...]
  //   [MEASURES ...]
  //   [ONE ROW PER MATCH | ALL ROWS PER MATCH]
  //   [AFTER MATCH SKIP ...]
  //   PATTERN ( pattern_expr )
  //   DEFINE var AS expr [, ...]
  // )
  match_recognize_clause: $ => seq(
    $.keyword_match_recognize,
    '(',
    optional($.partition_by),
    optional($.order_by),
    optional($.measures_clause),
    optional($.rows_per_match),
    optional($.after_match_skip),
    $.pattern_clause,
    optional($.subset_clause),
    $.define_clause,
    ')',
  ),

  // MEASURES expr AS alias [, ...]
  measures_clause: $ => seq(
    $.keyword_measures,
    comma_list($.measure_item, true),
  ),

  measure_item: $ => seq(
    optional(choice($.keyword_running, $.keyword_final)),
    $._expression,
    $.keyword_as,
    field('alias', $.identifier),
  ),

  // ONE ROW PER MATCH | ALL ROWS PER MATCH
  rows_per_match: $ => seq(
    choice(
      seq($.keyword_one, $.keyword_row),
      seq($.keyword_all, $.keyword_rows),
    ),
    $.keyword_per,
    $.keyword_match,
    optional(choice(
      seq($.keyword_show, $.keyword_empty, $.keyword_matches),
      seq($.keyword_omit, $.keyword_empty, $.keyword_matches),
      seq($.keyword_with, $.keyword_unmatched, $.keyword_rows),
    )),
  ),

  // AFTER MATCH SKIP { PAST LAST ROW | TO NEXT ROW | TO FIRST var | TO LAST var }
  after_match_skip: $ => seq(
    $.keyword_after,
    $.keyword_match,
    $.keyword_skip,
    choice(
      seq($.keyword_past, $.keyword_last, $.keyword_row),
      seq($.keyword_to, $.keyword_next, $.keyword_row),
      seq($.keyword_to, $.keyword_first, $.identifier),
      seq($.keyword_to, $.keyword_last, $.identifier),
      seq($.keyword_to, $.identifier),
    ),
  ),

  // PATTERN ( row pattern ): variables, ( ), |, ^ and $ anchors, {- exclusion -}, PERMUTE (…)
  pattern_clause: $ => seq(
    $.keyword_pattern,
    '(',
    $._pattern_alternation,
    ')',
  ),

  _pattern_alternation: $ => seq(
    repeat1($.pattern_term),
    repeat(seq('|', repeat1($.pattern_term))),
  ),

  pattern_term: $ => seq(
    choice(
      $.identifier,
      '^',
      '$',
      seq('(', $._pattern_alternation, ')'),
      seq('{-', repeat1($.pattern_term), '-}'),
      seq($.keyword_permute, paren_list($.identifier, true)),
    ),
    optional($.pattern_quantifier),
  ),

  // + * ? {n} {n,} {,m} {n,m}, each optionally followed by ? (reluctant)
  pattern_quantifier: $ => seq(
    choice(
      '+',
      '*',
      '?',
      seq('{', choice(
        seq(alias($._natural_number, $.literal), optional(seq(',', optional(alias($._natural_number, $.literal))))),
        seq(',', alias($._natural_number, $.literal)),
      ), '}'),
    ),
    optional('?'),
  ),

  // SUBSET ab = (a, b) [, …]
  subset_clause: $ => seq(
    $.keyword_subset,
    comma_list(seq($.identifier, '=', paren_list($.identifier, true)), true),
  ),

  // DEFINE var AS expr [, ...]
  define_clause: $ => seq(
    $.keyword_define,
    comma_list($.define_item, true),
  ),

  define_item: $ => seq(
    $.identifier,
    $.keyword_as,
    $._expression,
  ),

};
