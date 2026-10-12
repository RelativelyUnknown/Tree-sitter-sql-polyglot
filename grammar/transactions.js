export default {

  transaction: $ => prec.dynamic(1, seq(
    choice(
      seq(
        $.keyword_begin,
        optional(
          choice(
            $.keyword_transaction,
            $.keyword_work,
          ),
        ),
      ),
      seq(
        $.keyword_start,
        $.keyword_transaction,
        optional(
          seq(
            $.transaction_mode,
            repeat(
              seq(
                optional(','),
                $.transaction_mode,
              ),
            ),
          ),
        ),
      ),
    ),
    optional(';'),
    repeat(
      seq(
        $.statement,
        ';'
      ),
    ),
    choice(
      $._commit,
      $._rollback,
    ),
  )),

  // ANSI <transaction mode>: isolation level or access mode
  transaction_mode: $ => choice(
    seq(
      $.keyword_isolation,
      $.keyword_level,
      choice(
        $.keyword_serializable,
        seq($.keyword_repeatable, $.keyword_read),
        seq($.keyword_read, $.keyword_committed),
        seq($.keyword_read, $.keyword_uncommitted),
      ),
    ),
    seq($.keyword_read, $.keyword_only),
    seq($.keyword_read, $.keyword_write),
    $.transaction_diagnostics,
  ),

  // ANSI <diagnostics size>: DIAGNOSTICS SIZE n
  transaction_diagnostics: $ => seq(
    $.keyword_diagnostics,
    $.keyword_size,
    $.literal,
  ),

  // ANSI <transaction chain>: AND [NO] CHAIN
  _transaction_chain: $ => seq(
    $.keyword_and,
    optional($.keyword_no),
    $.keyword_chain,
  ),

  _commit: $ => seq(
    $.keyword_commit,
    optional(
      choice(
        $.keyword_transaction,
        $.keyword_work,
      ),
    ),
    optional($._transaction_chain),
  ),

  _rollback: $ => seq(
    $.keyword_rollback,
    optional(
      choice(
        $.keyword_transaction,
        $.keyword_work,
      ),
    ),
    optional($._transaction_chain),
  ),

  // Standalone forms. Scripts routinely issue COMMIT / ROLLBACK / START TRANSACTION as separate
  // statements; the BEGIN ... COMMIT block above stays the preferred parse when both apply.
  commit_statement: $ => $._commit,

  rollback_statement: $ => $._rollback,

  start_transaction_statement: $ => seq(
    $.keyword_start,
    $.keyword_transaction,
    optional(
      seq(
        $.transaction_mode,
        repeat(
          seq(
            optional(','),
            $.transaction_mode,
          ),
        ),
      ),
    ),
  ),

  _transaction_statement: $ => choice(
    $.commit_statement,
    $.rollback_statement,
    $.start_transaction_statement,
    $.savepoint_statement,
    $.release_savepoint_statement,
    $.rollback_to_savepoint_statement,
  ),

  savepoint_statement: $ => seq(
    $.keyword_savepoint,
    field('name', $.identifier),
  ),

  release_savepoint_statement: $ => seq(
    $.keyword_release,
    optional($.keyword_savepoint),
    field('name', $.identifier),
  ),

  rollback_to_savepoint_statement: $ => seq(
    $.keyword_rollback,
    optional(
      choice(
        $.keyword_transaction,
        $.keyword_work,
      ),
    ),
    optional($._transaction_chain),
    $.keyword_to,
    optional($.keyword_savepoint),
    field('name', $.identifier),
  ),

};
