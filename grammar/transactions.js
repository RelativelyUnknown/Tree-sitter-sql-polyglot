export default {

  transaction: $ => seq(
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
  ),

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
  ),

  _commit: $ => seq(
    $.keyword_commit,
    optional(
      choice(
        $.keyword_transaction,
        $.keyword_work,
      ),
    ),
  ),

  _rollback: $ => seq(
    $.keyword_rollback,
    optional(
      choice(
        $.keyword_transaction,
        $.keyword_work,
      ),
    ),
  ),

  _transaction_statement: $ => choice(
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
    $.keyword_to,
    optional($.keyword_savepoint),
    field('name', $.identifier),
  ),

};
