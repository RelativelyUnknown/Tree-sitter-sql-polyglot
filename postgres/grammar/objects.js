import { comma_list, paren_list } from '../../grammar/helpers.js';

// PostgreSQL object-definition statements not covered by the shared base.
//
// Syntax follows the PostgreSQL 17 reference verbatim:
//   SECURITY LABEL        https://www.postgresql.org/docs/current/sql-security-label.html
//   REASSIGN OWNED        https://www.postgresql.org/docs/current/sql-reassign-owned.html
//   IMPORT FOREIGN SCHEMA https://www.postgresql.org/docs/current/sql-importforeignschema.html
//   CREATE COLLATION      https://www.postgresql.org/docs/current/sql-createcollation.html
//   CREATE CONVERSION     https://www.postgresql.org/docs/current/sql-createconversion.html
//   CREATE ACCESS METHOD  https://www.postgresql.org/docs/current/sql-create-access-method.html
//   CREATE TRANSFORM      https://www.postgresql.org/docs/current/sql-createtransform.html
//   CREATE EVENT TRIGGER  https://www.postgresql.org/docs/current/sql-createeventtrigger.html
export default {

  // SECURITY LABEL [ FOR provider ] ON <object> IS { 'label' | NULL }
  security_label_statement: $ => seq(
    $.keyword_security,
    $.keyword_label,
    optional(seq($.keyword_for, field('provider', $.identifier))),
    $.keyword_on,
    $._security_label_object,
    $.keyword_is,
    field('label', choice(alias($._literal_string, $.literal), $.keyword_null)),
  ),

  _security_label_object: $ => choice(
    seq($.keyword_table, $.object_reference),
    seq($.keyword_column, $.object_reference),
    seq($.keyword_database, $.object_reference),
    seq($.keyword_domain, $.object_reference),
    seq($.keyword_schema, $.object_reference),
    seq($.keyword_sequence, $.object_reference),
    seq($.keyword_type, $.object_reference),
    seq($.keyword_view, $.object_reference),
    seq($.keyword_role, $.object_reference),
    seq($.keyword_tablespace, $.object_reference),
    seq($.keyword_publication, $.object_reference),
    seq($.keyword_subscription, $.object_reference),
    seq($.keyword_event, $.keyword_trigger, $.object_reference),
    seq($.keyword_foreign, $.keyword_table, $.object_reference),
    seq($.keyword_materialized, $.keyword_view, $.object_reference),
    seq(optional($.keyword_procedural), $.keyword_language, $.object_reference),
    seq($.keyword_large, $.keyword_object, alias($._integer, $.literal)),
    seq(
      choice($.keyword_function, $.keyword_procedure, $.keyword_routine, $.keyword_aggregate),
      $.object_reference,
      optional($.function_arguments),
    ),
  ),

  // REASSIGN OWNED BY role [, ...] TO role
  reassign_owned_statement: $ => seq(
    $.keyword_reassign,
    $.keyword_owned,
    $.keyword_by,
    comma_list($._role_specification, true),
    $.keyword_to,
    field('new_role', $._role_specification),
  ),

  _role_specification: $ => choice(
    $.keyword_current_role,
    $.keyword_current_user,
    $.keyword_session_user,
    $.identifier,
  ),

  // IMPORT FOREIGN SCHEMA remote [ { LIMIT TO | EXCEPT } (tables) ]
  //   FROM SERVER server INTO local [ OPTIONS (...) ]
  import_foreign_schema_statement: $ => seq(
    $.keyword_import,
    $.keyword_foreign,
    $.keyword_schema,
    field('remote_schema', $.identifier),
    optional(seq(
      choice(seq($.keyword_limit, $.keyword_to), $.keyword_except),
      paren_list($.object_reference, true),
    )),
    $.keyword_from,
    $.keyword_server,
    field('server', $.identifier),
    $.keyword_into,
    field('local_schema', $.identifier),
    optional(seq($.keyword_options, paren_list($._key_value_option, true))),
  ),

  _key_value_option: $ => seq(
    field('key', $.identifier),
    field('value', alias($._literal_string, $.literal)),
  ),

  // CREATE COLLATION [IF NOT EXISTS] name ( option = value, ... )
  // CREATE COLLATION [IF NOT EXISTS] name FROM existing
  create_collation_statement: $ => seq(
    $.keyword_create,
    $.keyword_collation,
    optional($._if_not_exists),
    field('name', $.object_reference),
    choice(
      paren_list(seq(field('option', $.identifier), '=', field('value', $._expression)), true),
      seq($.keyword_from, field('existing', $.object_reference)),
    ),
  ),

  // CREATE [DEFAULT] CONVERSION name FOR src TO dest FROM function
  create_conversion_statement: $ => seq(
    $.keyword_create,
    optional($.keyword_default),
    $.keyword_conversion,
    field('name', $.object_reference),
    $.keyword_for,
    field('source_encoding', alias($._literal_string, $.literal)),
    $.keyword_to,
    field('dest_encoding', alias($._literal_string, $.literal)),
    $.keyword_from,
    field('function', $.object_reference),
  ),

  // CREATE ACCESS METHOD name TYPE type HANDLER handler
  create_access_method_statement: $ => seq(
    $.keyword_create,
    $.keyword_access,
    $.keyword_method,
    field('name', $.identifier),
    $.keyword_type,
    // access_method_type is INDEX or TABLE — both lex as keywords, so they
    // must be listed explicitly rather than matched as a bare identifier.
    field('am_type', choice($.keyword_index, $.keyword_table)),
    $.keyword_handler,
    field('handler', $.object_reference),
  ),

  // CREATE [OR REPLACE] TRANSFORM FOR type LANGUAGE lang
  //   ( FROM SQL WITH FUNCTION f [(types)], TO SQL WITH FUNCTION g [(types)] )
  create_transform_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_transform,
    $.keyword_for,
    // _type covers built-in type keywords (int, timestamp, …) AND falls back
    // to custom_type: object_reference, so it already spans both cases.
    // choice($._type, $.object_reference) would be ambiguous, not additive.
    field('type', $._type),
    $.keyword_language,
    field('language', $.identifier),
    '(',
    comma_list($._transform_function, true),
    ')',
  ),

  _transform_function: $ => seq(
    choice($.keyword_from, $.keyword_to),
    $.keyword_sql,
    $.keyword_with,
    $.keyword_function,
    field('function', $.object_reference),
    optional($.function_arguments),
  ),

  // CREATE EVENT TRIGGER name ON event
  //   [ WHEN var IN (values) [AND ...] ] EXECUTE {FUNCTION|PROCEDURE} f()
  create_event_trigger_statement: $ => seq(
    $.keyword_create,
    $.keyword_event,
    $.keyword_trigger,
    field('name', $.identifier),
    $.keyword_on,
    field('event', $.identifier),
    optional(seq(
      $.keyword_when,
      $._event_trigger_filter,
      repeat(seq($.keyword_and, $._event_trigger_filter)),
    )),
    $.keyword_execute,
    choice($.keyword_function, $.keyword_procedure),
    field('function', $.object_reference),
    '(',
    ')',
  ),

  _event_trigger_filter: $ => seq(
    field('variable', $.identifier),
    $.keyword_in,
    paren_list(alias($._literal_string, $.literal), true),
  ),

};
