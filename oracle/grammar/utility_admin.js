import { make_keyword } from '../../grammar/helpers.js';

// ANALYZE, COMMENT ON for the Oracle object types and CREATE DATABASE LINK (Oracle SQL Language
// Reference 26ai). Each rule replaces the one it extends and keeps every form that one accepted.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_chained:       _ => kw('chained'),
  keyword_credential:    _ => kw('credential'),
  keyword_dangling:      _ => kw('dangling'),
  keyword_graph:         _ => kw('graph'),
  keyword_indextype:     _ => kw('indextype'),
  keyword_property:      _ => kw('property'),

  // ── ANALYZE ────────────────────────────────────────────────────────────

  analyze_statement: $ => seq(
    $.keyword_analyze,
    choice($.keyword_table, $.keyword_index, $.keyword_cluster),
    $.object_reference,
    optional($.partition_extension),
    choice(
      seq($.keyword_compute, $.keyword_statistics),
      seq(
        $.keyword_estimate,
        $.keyword_statistics,
        optional(seq(
          $.keyword_sample,
          alias($._integer, $.literal),
          choice($.keyword_rows, $.keyword_percent),
        )),
      ),
      seq(
        $.keyword_validate, $.keyword_structure,
        optional(seq(
          $.keyword_cascade,
          optional(choice(
            $.keyword_fast,
            seq(
              $.keyword_complete,
              optional(choice($.keyword_online, $.keyword_offline)),
              optional(seq($.keyword_into, $.object_reference)),
            ),
          )),
        )),
      ),
      seq($.keyword_delete, optional($.keyword_system), $.keyword_statistics),
      seq($.keyword_list, $.keyword_chained, $.keyword_rows, optional(seq($.keyword_into, $.object_reference))),
      seq(
        $.keyword_validate, $.keyword_ref, $.keyword_update,
        optional(seq($.keyword_set, $.keyword_dangling, $.keyword_to, $.keyword_null)),
      ),
    ),
  ),

  // ── COMMENT ON ─────────────────────────────────────────────────────────

  comment_statement: $ => seq(
    $.keyword_comment,
    $.keyword_on,
    choice($._comment_target, $._oracle_comment_target),
    $.keyword_is,
    choice(
      $.keyword_null,
      alias($._literal_string, $.literal),
    ),
  ),

  _oracle_comment_target: $ => choice(
    seq($.keyword_audit, $.keyword_policy, $.identifier),
    seq($.keyword_edition, $.identifier),
    seq($.keyword_indextype, $.object_reference),
    seq($.keyword_mining, $.keyword_model, $.object_reference),
    seq($.keyword_operator, $.object_reference),
    seq($.keyword_property, $.keyword_graph, $.object_reference),
  ),

  // ── CREATE DATABASE LINK ───────────────────────────────────────────────

  create_database_link_statement: $ => seq(
    $.keyword_create,
    optional($.keyword_shared),
    optional($.keyword_public),
    $.keyword_database,
    $.keyword_link,
    optional($._if_not_exists),
    $.object_reference,
    optional(seq(
      $.keyword_connect,
      choice(
        seq(
          $.keyword_to,
          choice(
            $.keyword_current_user,
            seq($.identifier, $.keyword_identified, $.keyword_by, $._expression),
          ),
        ),
        seq($.keyword_with, $.identifier),
      ),
    )),
    optional(seq(
      $.keyword_authenticated,
      choice(
        seq($.keyword_by, $.identifier, $.keyword_identified, $.keyword_by, $._expression),
        seq($.keyword_with, $.keyword_credential),
      ),
    )),
    optional(seq($.keyword_using, alias($._literal_string, $.literal))),
  ),

};
