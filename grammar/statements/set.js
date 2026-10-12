import { comma_list } from "../helpers.js";

export default {

  set_statement: $ => seq(
    $.keyword_set,
    choice(
      seq($.keyword_constraints, choice($.keyword_all, comma_list($.identifier, true)), choice($.keyword_deferred, $.keyword_immediate)),
      // ISO 9075 SET [LOCAL] TRANSACTION <transaction mode> [, ...]
      seq(
        optional($.keyword_local),
        $.keyword_transaction,
        $.transaction_mode,
        repeat(seq(optional(','), $.transaction_mode)),
      ),
      seq($.keyword_transaction, $.keyword_snapshot, $._transaction_mode),
      seq($.keyword_session, $.keyword_characteristics, $.keyword_as, $.keyword_transaction, $._transaction_mode),
    ),
  ),

  _transaction_mode: $ => seq(
    $.keyword_isolation,
    $.keyword_level,
    choice(
      $.keyword_serializable,
      seq($.keyword_repeatable, $.keyword_read),
      seq($.keyword_read, $.keyword_committed),
      seq($.keyword_read, $.keyword_uncommitted),
    ),
    choice(
      seq($.keyword_read, $.keyword_write),
      seq($.keyword_read, $.keyword_only),
    ),
    optional($.keyword_not),
    $.keyword_deferrable,
  ),

  reset_statement: $ => seq(
    $.keyword_reset,
    choice(
      $.object_reference,
      $.keyword_all,
      seq($.keyword_session, $.keyword_authorization),
      $.keyword_role,
    ),
  ),

  use_statement: $ => seq(
    $.keyword_use,
    optional(choice($.keyword_database, $.keyword_schema, $.keyword_catalog)),
    $.object_reference,
  ),

};
