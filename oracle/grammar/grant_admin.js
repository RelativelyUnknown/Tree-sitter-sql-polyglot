import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';

// GRANT / REVOKE (Oracle SQL Language Reference 26ai): system privileges, roles, object privileges
// with column lists, schema privileges, program grantees and the WITH ... OPTION family. The
// privilege vocabulary is explicit: an action verb, an optional ANY and an object noun.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_delegate:   _ => kw('delegate'),
  keyword_hierarchy:  _ => kw('hierarchy'),
  keyword_inherit:    _ => kw('inherit'),
  keyword_java:       _ => kw('java'),
  keyword_mining:     _ => kw('mining'),
  keyword_model:      _ => kw('model'),
  keyword_debug:      _ => kw('debug'),
  keyword_resource:   _ => kw('resource'),
  keyword_rewrite:    _ => kw('rewrite'),
  keyword_dimension:  _ => kw('dimension'),
  keyword_library:    _ => kw('library'),

  // ── Privileges ─────────────────────────────────────────────────────────

  _privilege_type: $ => choice(
    seq($.keyword_all, optional($.keyword_privileges)),
    // object privileges, optionally with a column list
    seq(
      choice($.keyword_select, $.keyword_insert, $.keyword_update, $.keyword_references),
      optional(paren_list($.identifier, true)),
    ),
    $.keyword_delete,
    $.keyword_execute,
    $.keyword_usage,
    $.keyword_trigger,
    $.keyword_read,
    $.keyword_write,
    $.keyword_use,
    $.keyword_debug,
    $.keyword_alter,
    $.keyword_index,
    seq($.keyword_inherit, $.keyword_privileges),
    seq($.keyword_query, $.keyword_rewrite),
    // system and schema privileges: CREATE SESSION, SELECT ANY TABLE, ALTER ANY MATERIALIZED VIEW
    seq(
      choice(
        $.keyword_create, $.keyword_alter, $.keyword_drop, $.keyword_select, $.keyword_insert,
        $.keyword_update, $.keyword_delete, $.keyword_execute, $.keyword_comment, $.keyword_lock,
        $.keyword_debug, $.keyword_flashback,
      ),
      optional($.keyword_any),
      $._privilege_noun,
    ),
    // a role
    $.identifier,
  ),

  _privilege_noun: $ => choice(
    $.keyword_session,
    $.keyword_table,
    $.keyword_view,
    seq($.keyword_materialized, $.keyword_view),
    $.keyword_sequence,
    $.keyword_synonym,
    seq($.keyword_public, $.keyword_synonym),
    $.keyword_procedure,
    $.keyword_trigger,
    $.keyword_type,
    $.keyword_index,
    $.keyword_dimension,
    $.keyword_cluster,
    seq($.keyword_database, optional($.keyword_link)),
    $.keyword_user,
    $.keyword_role,
    $.keyword_profile,
    $.keyword_tablespace,
    $.keyword_directory,
    $.keyword_library,
    $.keyword_operator,
    seq($.keyword_mining, $.keyword_model),
    $.keyword_edition,
    $.keyword_context,
  ),

  _grant_object: $ => choice(
    seq($.keyword_table, $.object_reference),
    seq($.keyword_view, $.object_reference),
    seq($.keyword_schema, $.object_reference),
    seq($.keyword_database, $.object_reference),
    seq($.keyword_function, $.object_reference),
    seq($.keyword_procedure, $.object_reference),
    seq($.keyword_sequence, $.object_reference),
    seq($.keyword_directory, $.object_reference),
    seq($.keyword_edition, $.object_reference),
    seq($.keyword_mining, $.keyword_model, $.object_reference),
    seq($.keyword_java, choice($.keyword_source, $.keyword_resource), $.object_reference),
    seq($.keyword_user, $.object_reference),
    $.object_reference,
  ),

  _grantee: $ => choice(
    seq(optional(choice($.keyword_user, $.keyword_group, $.keyword_role)), $.identifier),
    $.keyword_public,
    seq(choice($.keyword_procedure, $.keyword_function, $.keyword_package), $.object_reference),
  ),

  _container_clause: $ => seq($.keyword_container, '=', choice($.keyword_all, $.keyword_current)),

  grant_statement: $ => seq(
    $.keyword_grant,
    $._privilege_list,
    optional(seq($.keyword_on, $._grant_object)),
    $.keyword_to,
    $._grantee_list,
    optional(seq(
      $.keyword_identified, $.keyword_by,
      comma_list(choice($.identifier, alias($._literal_string, $.literal)), true),
    )),
    repeat(seq(
      $.keyword_with,
      choice($.keyword_grant, $.keyword_admin, $.keyword_delegate, $.keyword_hierarchy),
      $.keyword_option,
    )),
    optional($._container_clause),
  ),

  revoke_statement: $ => seq(
    $.keyword_revoke,
    optional(seq($.keyword_grant, $.keyword_option, $.keyword_for)),
    $._privilege_list,
    optional(seq($.keyword_on, $._grant_object)),
    $.keyword_from,
    $._grantee_list,
    optional(choice(
      $.keyword_cascade,
      $.keyword_restrict,
      seq($.keyword_cascade, $.keyword_constraints),
      $.keyword_force,
    )),
    optional($._container_clause),
  ),

};
