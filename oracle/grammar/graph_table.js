import { comma_list, make_keyword } from '../../grammar/helpers.js';

// GRAPH_TABLE operator (SQL/PGQ, Oracle SQL Language Reference 26ai): a graph pattern match used as a table
// reference. Vertices are (var IS label WHERE cond); edges are -[var IS label]->, <-[…]-, -[…]-, with abbreviated
// ->, <- and - forms and an optional quantifier ({n,m}, *, +, ?).

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_graph_table: _ => kw('graph_table'),

  // GRAPH_TABLE (graph MATCH pattern [, pattern …] [WHERE cond] [COLUMNS (expr [AS alias], …)])
  graph_table: $ => seq(
    $.keyword_graph_table,
    '(',
    $.object_reference,
    $.keyword_match,
    comma_list($.graph_path, true),
    optional($.where),
    optional(seq(
      $.keyword_columns,
      '(',
      comma_list(seq($._expression, optional(seq($.keyword_as, $.identifier))), true),
      ')',
    )),
    ')',
  ),

  // vertex (edge vertex)*
  graph_path: $ => seq(
    $.graph_vertex,
    repeat(seq($.graph_edge, $.graph_vertex)),
  ),

  graph_vertex: $ => seq('(', optional($._graph_element), ')'),

  graph_edge: $ => seq(
    choice(
      seq('-', '[', optional($._graph_element), ']', choice('-', '->')),
      seq('<-', '[', optional($._graph_element), ']', '-'),
      '->',
      '<-',
      '-',
    ),
    optional($.graph_quantifier),
  ),

  // var [IS label {| label}] [WHERE cond], at least one part
  _graph_element: $ => choice(
    seq($.identifier, optional($._graph_pattern_label), optional($.where)),
    seq($._graph_pattern_label, optional($.where)),
    $.where,
  ),

  _graph_pattern_label: $ => seq($.keyword_is, $.identifier, repeat(seq('|', $.identifier))),

  // {n} | {n,} | {,m} | {n,m} | * | + | ?
  graph_quantifier: $ => choice(
    seq(
      '{',
      optional(alias($._natural_number, $.literal)),
      optional(seq(',', optional(alias($._natural_number, $.literal)))),
      '}',
    ),
    '*',
    '+',
    '?',
  ),

};
