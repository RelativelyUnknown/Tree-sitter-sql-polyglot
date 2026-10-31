import { comma_list, optional_parenthesis, paren_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

export default {

  // Oracle: SELECT … FOR UPDATE [OF cols] [NOWAIT | WAIT n | SKIP LOCKED]
  _select_statement: $ => optional_parenthesis(
    seq(
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
  ),

  locking_clause: $ => seq(
    $.keyword_for,
    $.keyword_update,
    optional(seq($.keyword_of, comma_list($.object_reference, true))),
    optional(
      choice(
        $.keyword_nowait,
        seq($.keyword_wait, alias($._integer, $.literal)),
        seq($.keyword_skip, $.keyword_locked),
      ),
    ),
  ),

  // MODEL [IGNORE|KEEP NAV] [RETURN UPDATED|ALL ROWS]
  //   [PARTITION BY (…)] DIMENSION BY (…) MEASURES (…)
  //   RULES [UPDATE | UPSERT [ALL]] [SEQUENTIAL|AUTOMATIC ORDER]
  //   [ITERATE (n) [UNTIL (cond)]] ( cell = expr [, …] )
  model_clause: $ => seq(
    $.keyword_model,
    optional(seq(choice($.keyword_ignore, $.keyword_keep), $.keyword_nav)),
    optional(seq(
      $.keyword_return,
      choice($.keyword_updated, $.keyword_all),
      $.keyword_rows,
    )),
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
    $.keyword_rules,
    optional(choice(
      $.keyword_update,
      seq($.keyword_upsert, optional($.keyword_all)),
    )),
    optional(seq(
      choice($.keyword_sequential, $.keyword_automatic),
      $.keyword_order,
    )),
    optional(seq(
      $.keyword_iterate,
      wrapped_in_parenthesis(alias($._integer, $.literal)),
      optional(seq($.keyword_until, wrapped_in_parenthesis($._expression))),
    )),
    paren_list($.model_rule, true),
  ),

  model_column: $ => seq(
    field('value', $._expression),
    optional($._alias),
  ),

  // sales[2025] = sales[2024] * 1.1
  model_rule: $ => seq(
    $.model_cell,
    '=',
    $._expression,
  ),

  model_cell: $ => seq(
    field('name', $.identifier),
    '[',
    comma_list($._expression, true),
    ']',
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
