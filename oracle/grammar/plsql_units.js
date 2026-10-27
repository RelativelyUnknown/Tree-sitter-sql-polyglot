import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// PL/SQL stored units and the small DDL around them (Oracle SQL Language Reference 26ai):
// ALTER FUNCTION / PROCEDURE, DROP TRIGGER, the IF [NOT] EXISTS / EDITIONABLE / SHARING forms of
// SYNONYM, DIRECTORY and PACKAGE, TYPE BODY and the Oracle CREATE TRIGGER (simple and compound).
// The earlier generic forms of the rules overridden here stay accepted.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_compound:     _ => kw('compound'),
  keyword_crossedition: _ => kw('crossedition'),
  keyword_follows:      _ => kw('follows'),
  keyword_forward:      _ => kw('forward'),
  keyword_logoff:       _ => kw('logoff'),
  keyword_logon:        _ => kw('logon'),
  keyword_parent:       _ => kw('parent'),
  keyword_pluggable:    _ => kw('pluggable'),
  keyword_precedes:     _ => kw('precedes'),
  keyword_servererror:  _ => kw('servererror'),
  keyword_shutdown:     _ => kw('shutdown'),
  keyword_startup:      _ => kw('startup'),

  _oracle_unit_statement: $ => choice(
    $.alter_function_statement,
    $.alter_procedure_statement,
    $.drop_trigger_statement,
    $.create_type_body_statement,
  ),

  alter_function_statement: $ => seq(
    $.keyword_alter, $.keyword_function, optional($._if_exists),
    field('name', $.object_reference),
    choice($.compile_clause, $._editionable_clause),
  ),

  alter_procedure_statement: $ => seq(
    $.keyword_alter, $.keyword_procedure, optional($._if_exists),
    field('name', $.object_reference),
    choice($.compile_clause, $._editionable_clause),
  ),

  drop_trigger_statement: $ => seq(
    $.keyword_drop, $.keyword_trigger, optional($._if_exists),
    field('name', $.object_reference),
  ),

  // ── Synonyms and directories ───────────────────────────────────────────

  create_synonym_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._editionable_clause),
    optional($.keyword_public),
    $.keyword_synonym,
    optional($._if_not_exists),
    $.object_reference,
    optional($.sharing_clause),
    $.keyword_for,
    $.object_reference,
    optional(seq('@', $.identifier)),
  ),

  drop_synonym_statement: $ => seq(
    $.keyword_drop,
    optional($.keyword_public),
    $.keyword_synonym,
    optional($._if_exists),
    $.object_reference,
    optional($.keyword_force),
  ),

  create_directory_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_directory,
    optional($._if_not_exists),
    field('name', $.identifier),
    optional($.sharing_clause),
    $.keyword_as,
    field('path', alias($._literal_string, $.literal)),
  ),

  // ── Packages ───────────────────────────────────────────────────────────

  _package_property: $ => choice(
    seq($.keyword_authid, choice($.keyword_current_user, $.keyword_definer)),
    seq($.keyword_accessible, $.keyword_by, paren_list(
      seq(optional(choice($.keyword_function, $.keyword_procedure, $.keyword_package, $.keyword_trigger, $.keyword_type)), $.object_reference),
      true,
    )),
    seq($.keyword_default, $.keyword_collation, $.identifier),
    $.sharing_clause,
  ),

  create_package: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._editionable_clause),
    $.keyword_package,
    optional($._editionable_clause),
    optional($._if_not_exists),
    field('name', $.object_reference),
    repeat($._package_property),
    choice($.keyword_is, $.keyword_as),
    repeat($._package_spec_item),
    $.keyword_end,
    optional(field('end_name', $.identifier)),
  ),

  create_package_body: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._editionable_clause),
    $.keyword_package,
    $.keyword_body,
    optional($._if_not_exists),
    field('name', $.object_reference),
    choice($.keyword_is, $.keyword_as),
    repeat($._package_body_item),
    $.keyword_end,
    optional(field('end_name', $.identifier)),
  ),

  // ── Type bodies ────────────────────────────────────────────────────────

  create_type_body_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._editionable_clause),
    $.keyword_type,
    $.keyword_body,
    optional($._if_not_exists),
    field('name', $.object_reference),
    choice($.keyword_is, $.keyword_as),
    repeat1($._type_body_element),
    $.keyword_end,
  ),

  _type_body_element: $ => choice(
    seq(
      repeat($._type_modifier_or_overriding),
      choice(seq(optional(choice($.keyword_map, $.keyword_order)), $.keyword_member), $.keyword_static),
      $.subprogram_definition,
    ),
    seq(
      $.keyword_constructor, $.keyword_function,
      field('name', $.identifier),
      optional(paren_list($.plsql_parameter, true)),
      $.keyword_return, $.keyword_self, $.keyword_as, $.keyword_result,
      choice($.keyword_is, $.keyword_as),
      $._subprogram_body,
      ';',
    ),
  ),

  // ── Triggers ───────────────────────────────────────────────────────────

  // Replaces the Oracle rule of grammar.js (BEFORE/AFTER/INSTEAD OF, FOR EACH ROW, WHEN, block body),
  // which this form accepts in full.
  create_trigger: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._editionable_clause),
    $.keyword_trigger,
    optional($._if_not_exists),
    field('name', $.object_reference),
    optional($.sharing_clause),
    optional(seq($.keyword_default, $.keyword_collation, $.identifier)),
    choice(
      seq(
        $._trigger_timing,
        $._trigger_events,
        $.keyword_on,
        $._trigger_target,
        repeat($._trigger_option),
        choice($.compound_statement, seq($.keyword_call, $.invocation)),
      ),
      seq(
        $.keyword_for,
        $._trigger_events,
        $.keyword_on,
        $._trigger_target,
        repeat($._trigger_option),
        $.keyword_compound, $.keyword_trigger,
        repeat1($._timing_section),
        $.keyword_end,
        optional($.identifier),
      ),
    ),
  ),

  _trigger_timing: $ => choice($.keyword_before, $.keyword_after, seq($.keyword_instead, $.keyword_of)),

  _trigger_events: $ => seq($._trigger_event, repeat(seq($.keyword_or, $._trigger_event))),

  _trigger_event: $ => choice(
    $._create_trigger_event,
    $.keyword_create, $.keyword_alter, $.keyword_drop, $.keyword_analyze, $.keyword_audit,
    $.keyword_comment, $.keyword_grant, $.keyword_rename, $.keyword_revoke, $.keyword_ddl,
    $.keyword_logon, $.keyword_logoff, $.keyword_startup, $.keyword_shutdown, $.keyword_servererror,
  ),

  _trigger_target: $ => choice(
    $.object_reference,
    seq($.keyword_nested, $.keyword_table, $.identifier, $.keyword_of, $.object_reference),
    seq(optional(seq($.identifier, '.')), $.keyword_schema),
    $.keyword_database,
    seq($.keyword_pluggable, $.keyword_database),
  ),

  _trigger_option: $ => choice(
    seq($.keyword_referencing, repeat1(seq(choice($.keyword_old, $.keyword_new, $.keyword_parent), optional($.keyword_as), $.identifier))),
    seq($.keyword_for, $.keyword_each, $.keyword_row),
    seq(choice($.keyword_forward, $.keyword_reverse), $.keyword_crossedition),
    seq(choice($.keyword_follows, $.keyword_precedes), comma_list($.object_reference, true)),
    choice($.keyword_enable, $.keyword_disable),
    seq($.keyword_when, wrapped_in_parenthesis($._expression)),
  ),

  _timing_point: $ => choice(
    seq($.keyword_before, $.keyword_statement),
    seq($.keyword_before, $.keyword_each, $.keyword_row),
    seq($.keyword_after, $.keyword_statement),
    seq($.keyword_after, $.keyword_each, $.keyword_row),
    seq($.keyword_instead, $.keyword_of, $.keyword_each, $.keyword_row),
  ),

  _timing_section: $ => seq(
    $._timing_point,
    $.keyword_is,
    repeat($._declaration),
    $.keyword_begin,
    repeat($._plsql_stmt),
    optional(seq($.keyword_exception, repeat1($.exception_handler))),
    $.keyword_end,
    $._timing_point,
    ';',
  ),

};
