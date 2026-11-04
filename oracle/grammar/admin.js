import { comma_list, optional_parenthesis, paren_list, wrapped_in_parenthesis, make_keyword, ordered_optionals } from '../../grammar/helpers.js';

export default {

  // Oracle: SELECT … FOR UPDATE [OF cols] [NOWAIT | WAIT n | SKIP LOCKED]
  _select_statement: $ => optional_parenthesis($._select_core),

  _select_core: $ => seq(
    $.select,
    optional(
      seq(
        optional(seq($.keyword_bulk, $.keyword_collect)),
        $.keyword_into,
        $.select_expression,
      ),
    ),
    optional($.from),
    repeat($.locking_clause),
  ),

  locking_clause: $ => seq(
    $.keyword_for,
    $.keyword_update,
    optional(seq($.keyword_of, comma_list($.object_reference, true))),
    optional(
      choice(
        $.keyword_nowait,
        seq(
          $.keyword_wait,
          choice(
            $.keyword_forever,
            seq(alias($._integer, $.literal), optional(choice($.keyword_seconds, $.keyword_milliseconds))),
          ),
        ),
        seq($.keyword_skip, $.keyword_locked),
      ),
    ),
  ),

  keyword_main:      _ => token(prec(1, make_keyword("main"))),
  keyword_single:    _ => token(prec(1, make_keyword("single"))),
  keyword_decrement: _ => token(prec(1, make_keyword("decrement"))),

  // MODEL [cell_reference_options] [RETURN UPDATED|ALL ROWS] [REFERENCE name ON (query) columns options]*
  //   [MAIN name] columns [cell_reference_options] [RULES] [UPDATE | UPSERT [ALL]]
  //   [SEQUENTIAL|AUTOMATIC ORDER] [ITERATE (n) [UNTIL (cond)]] ( cell = expr [, …] )
  model_clause: $ => seq(
    $.keyword_model,
    repeat($._model_option),
    repeat($.model_reference),
    optional(seq($.keyword_main, $.identifier)),
    $._model_columns,
    repeat($._model_option),
    optional($._model_tail_0),
    paren_list($.model_rule, true),
  ),

  // [RULES] [UPDATE | UPSERT [ALL]] [SEQUENTIAL | AUTOMATIC ORDER] [ITERATE (n) [UNTIL (cond)]], in this order
  ...ordered_optionals('_model_tail', [
    $ => $.keyword_rules,
    $ => choice(
      $.keyword_update,
      seq($.keyword_upsert, optional($.keyword_all)),
    ),
    $ => seq(
      choice($.keyword_sequential, $.keyword_automatic),
      $.keyword_order,
    ),
    $ => seq(
      $.keyword_iterate,
      wrapped_in_parenthesis(alias($._integer, $.literal)),
      optional(seq($.keyword_until, wrapped_in_parenthesis($._expression))),
    ),
  ]),

  // {IGNORE | KEEP} NAV | UNIQUE {DIMENSION | SINGLE REFERENCE} | RETURN {UPDATED | ALL} ROWS
  _model_option: $ => choice(
    seq(choice($.keyword_ignore, $.keyword_keep), $.keyword_nav),
    seq($.keyword_unique, choice($.keyword_dimension, seq($.keyword_single, $.keyword_reference))),
    seq($.keyword_return, choice($.keyword_updated, $.keyword_all), $.keyword_rows),
  ),

  // REFERENCE name ON (query) DIMENSION BY (…) MEASURES (…)
  model_reference: $ => seq(
    $.keyword_reference,
    $.identifier,
    $.keyword_on,
    $.subquery,
    $._model_columns,
    repeat($._model_option),
  ),

  _model_columns: $ => seq(
    optional(seq(
      $.keyword_partition,
      $.keyword_by,
      paren_list(alias($.model_column, $.term), true),
    )),
    $.keyword_dimension,
    $.keyword_by,
    paren_list(alias($.model_column, $.term), true),
    $.keyword_measures,
    paren_list(alias($.model_column, $.term), true),
  ),

  model_column: $ => seq(
    field('value', $._expression),
    optional($._alias),
  ),

  // [UPSERT | UPDATE] sales[2025] [ORDER BY y DESC] = sales[2024] * 1.1
  model_rule: $ => seq(
    optional(choice($.keyword_update, $.keyword_upsert)),
    $.model_cell,
    optional($.order_by),
    '=',
    $._expression,
  ),

  // s[2024], s[ANY, c = 'a'], s[FOR y IN (2024, 2025)], s[FOR y FROM 1 TO 9 INCREMENT 1]
  model_cell: $ => seq(
    field('name', $.identifier),
    '[',
    comma_list(choice($._expression, $.keyword_any, $.model_for_loop), true),
    ']',
  ),

  model_for_loop: $ => seq(
    $.keyword_for,
    choice($.identifier, paren_list($.identifier, true)),
    choice(
      seq($.keyword_in, choice(paren_list($._expression, true), $.subquery)),
      seq(
        optional(seq($.keyword_like, $._expression)),
        $.keyword_from, $._expression,
        $.keyword_to, $._expression,
        choice($.keyword_increment, $.keyword_decrement), $._expression,
      ),
    ),
  ),

  // A cell reference or JSON array step on a named value: s[2024], s['a', 2023], s[ANY], r.v[1],
  // po.doc.items[*], po.doc.items[0 to 2]. The left side is a (qualified) name, not any expression,
  // so [ never continues an arbitrary expression. x[a:b] slices stay.
  subscript: $ => prec.left('binary_is',
    seq(
      field('expression', alias($._qualified_field, $.field)),
      '[',
      choice(
        comma_list(
          choice(
            field('subscript', $._expression),
            $.keyword_any,
            '*',
            seq($._expression, $.keyword_to, $._expression),
          ),
          true,
        ),
        seq(
          optional(field('lower', $._expression)),
          ':',
          optional(field('upper', $._expression)),
        ),
      ),
      ']',
    ),
  ),

  // ALTER SYSTEM …
  alter_system_statement: $ => prec.right(seq(
    $.keyword_alter,
    $.keyword_system,
    choice(
      seq(
        $.keyword_set,
        repeat1(seq(
          field('parameter', $.identifier),
          '=',
          field('value', $._expression),
        )),
        optional(seq(
          $.keyword_scope,
          '=',
          choice($.keyword_memory, $.keyword_spfile, $.keyword_both),
        )),
        optional(seq(
          $.keyword_sid,
          '=',
          alias($._literal_string, $.literal),
        )),
      ),
      seq($.keyword_flush, $.identifier),
      seq(
        $.keyword_kill,
        $.keyword_session,
        alias($._literal_string, $.literal),
        optional($.keyword_immediate),
      ),
      $.keyword_checkpoint,
      seq($.keyword_switch, $.keyword_logfile),
      seq($.keyword_archive, $.keyword_log, $.keyword_current),
    ),
  )),

};
