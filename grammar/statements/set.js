import { comma_list } from "../helpers.js";

export default {

  // ISO 9075: SET CONSTRAINTS, SET [LOCAL] TRANSACTION and SET SESSION CHARACTERISTICS AS TRANSACTION.
  set_statement: $ => seq(
    $.keyword_set,
    choice(
      seq($.keyword_constraints, choice($.keyword_all, comma_list($.identifier, true)), choice($.keyword_deferred, $.keyword_immediate)),
      seq(
        optional($.keyword_local),
        $.keyword_transaction,
        $.transaction_mode,
        repeat(seq(',', $.transaction_mode)),
      ),
      seq(
        $.keyword_session,
        $.keyword_characteristics,
        $.keyword_as,
        $.keyword_transaction,
        $.transaction_mode,
        repeat(seq(',', $.transaction_mode)),
      ),
    ),
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
