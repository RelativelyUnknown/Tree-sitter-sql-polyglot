import { comma_list, paren_list } from '../../grammar/helpers.js';

// SAP HANA statements that had no rule at all. The inventory comes from the
// "Alphabetical List of Statements" section of the HANA Cloud SQL Reference
// Guide (220 statements), read through help.sap.com's deliverableMetadata →
// pagecontent API.
export default {

  // LOCK TABLE t IN { EXCLUSIVE | SHARE } MODE [NOWAIT]
  lock_table_statement: $ => prec.right(seq(
    $.keyword_lock,
    $.keyword_table,
    field('table', $.object_reference),
    $.keyword_in,
    field('mode', choice($.keyword_exclusive, $.keyword_share)),
    $.keyword_mode,
    optional($.keyword_nowait),
  )),

  // MERGE DELTA OF t [PART n] [WITH PARAMETERS (…)]
  merge_delta_statement: $ => prec.right(seq(
    $.keyword_merge,
    $.keyword_delta,
    $.keyword_of,
    field('table', $.object_reference),
    optional(seq($.keyword_with, $.keyword_parameters, paren_list($._expression, true))),
  )),

  // LOAD t [ALL | (col, …)]   |   UNLOAD t
  load_unload_statement: $ => prec.right(seq(
    choice($.keyword_load, $.keyword_unload),
    field('table', $.object_reference),
    optional(choice($.keyword_all, paren_list($.identifier, true))),
  )),

  // REFRESH { VIEW v | STATISTICS … | PSE p }
  refresh_object_statement: $ => prec.right(seq(
    $.keyword_refresh,
    choice(
      seq($.keyword_view, field('name', $.object_reference)),
      seq($.keyword_pse, field('name', $.object_reference)),
      seq(
        $.keyword_statistics,
        optional(seq($.keyword_on, field('name', $.object_reference))),
      ),
    ),
  )),

  // RENAME { COLUMN | INDEX | SCHEMA | VECTOR INDEX } old TO new
  // TABLE is absent: base's _rename_statement already covers RENAME TABLE.
  rename_object_statement: $ => seq(
    $.keyword_rename,
    choice(
      $.keyword_column,
      $.keyword_index,
      $.keyword_schema,
      seq($.keyword_vector, $.keyword_index),
    ),
    field('name', $.object_reference),
    $.keyword_to,
    field('new_name', $.object_reference),
  ),

  // SET SCHEMA s
  set_schema_statement: $ => seq(
    $.keyword_set,
    $.keyword_schema,
    field('name', $.object_reference),
  ),

  // ALTER SYSTEM <action>
  // The reference lists roughly forty ALTER SYSTEM forms (CLEAR CACHE, RECLAIM
  // DATAVOLUME, START/STOP PERFTRACE, DISCONNECT SESSION, …). They are
  // accepted as a word/option tail rather than enumerated: modelling each one
  // would add a large amount of grammar for statements that share no shape.
  alter_system_statement: $ => prec.right(seq(
    $.keyword_alter,
    $.keyword_system,
    repeat1(choice(
      $.keyword_all,
      $.keyword_set,
      $.keyword_session,
      $.keyword_cache,
      $.keyword_savepoint,
      $.system_option,
      $.literal,
      paren_list($._expression, true),
    )),
  )),

  // A bare word, or `name = scalar`. The value is a literal or identifier
  // rather than a full expression: with _expression here, `a = b = c` could
  // either nest as a binary_expression or continue the enclosing repeat,
  // which is an unresolvable conflict between the two rules.
  system_option: $ => seq(
    field('name', $.identifier),
    optional(seq('=', field('value', choice($.literal, $.identifier)))),
  ),

  // CREATE | DROP <object-kind> name [options]
  // One rule for the object kinds HANA adds that have a plain
  // `<kind> name [word …]` shape.
  hana_object_statement: $ => prec.right(seq(
    choice($.keyword_create, $.keyword_drop, $.keyword_alter),
    $._hana_object_kind,
    optional($._if_exists),
    field('name', $.object_reference),
    repeat(choice(
      seq($.keyword_for, field('target', $.object_reference)),
      $.system_option,
      $.literal,
      paren_list($._expression, true),
      seq($.keyword_set, $.system_option),
    )),
  )),

  // TABLE GROUP is deliberately absent: after `ALTER TABLE`, GROUP is an
  // extracted keyword and therefore indistinguishable from a table name, so
  // it would collide with base's alter_table.
  _hana_object_kind: $ => choice(
    seq($.keyword_audit, $.keyword_policy),
    $.keyword_credential,
    $.keyword_pse,
    $.keyword_certificate,
    seq($.keyword_schema, $.keyword_synonym),
    $.keyword_synonym,
    $.keyword_statistics,
    seq($.keyword_workload, $.keyword_class),
    seq($.keyword_workload, $.keyword_mapping),
    $.keyword_usergroup,
    $.keyword_rolegroup,
    seq($.keyword_jwt, $.keyword_provider),
    seq($.keyword_ldap, $.keyword_provider),
    seq($.keyword_saml, $.keyword_provider),
    seq($.keyword_x509, $.keyword_provider),
    seq($.keyword_remote, $.keyword_source),
    seq($.keyword_scheduler, $.keyword_job),
  ),

  // VALIDATE { USER u | LDAP PROVIDER p }
  validate_statement: $ => seq(
    $.keyword_validate,
    choice(
      seq($.keyword_user, field('name', $.object_reference)),
      seq($.keyword_ldap, $.keyword_provider, field('name', $.object_reference)),
    ),
  ),

  // ANNOTATE <kind> name SET|UNSET (…)
  annotate_statement: $ => prec.right(seq(
    $.keyword_annotate,
    field('kind', $.identifier),
    field('name', $.object_reference),
    repeat1(choice(
      seq($.keyword_set, paren_list($._expression, true)),
      seq($.keyword_unset, paren_list($._expression, true)),
      field('option', $.identifier),
    )),
  )),

  // CANCEL ASYNC CALL id
  cancel_async_call_statement: $ => seq(
    $.keyword_cancel,
    $.keyword_async,
    $.keyword_call,
    field('id', $._expression),
  ),

  // CALL proc(args) [WITH OVERVIEW] [ASYNC]
  call_statement: $ => prec.right(seq(
    $.keyword_call,
    field('procedure', $.object_reference),
    optional(paren_list($._expression)),
    repeat(field('option', $.identifier)),
  )),

  // CONNECT user PASSWORD pw
  connect_statement: $ => prec.right(seq(
    $.keyword_connect,
    field('user', $.object_reference),
    optional(seq($.keyword_password, field('password', $._expression))),
  )),

};
