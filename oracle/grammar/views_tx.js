import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// Views, materialized views, DROP INDEX / VIEW and the transaction-control statements
// (Oracle SQL Language Reference 26ai).

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_batch:       _ => kw('batch'),
  keyword_bequeath:    _ => kw('bequeath'),
  keyword_computation: _ => kw('computation'),
  keyword_concurrent:  _ => kw('concurrent'),
  keyword_edition:     _ => kw('edition'),
  keyword_editioning:  _ => kw('editioning'),
  keyword_enforced:    _ => kw('enforced'),
  keyword_evaluate:    _ => kw('evaluate'),
  keyword_id:          _ => kw('id'),
  keyword_indicator:   _ => kw('indicator'),
  keyword_precision:   _ => kw('precision'),
  keyword_recompile:   _ => kw('recompile'),
  keyword_under:       _ => kw('under'),
  keyword_reduced:     _ => kw('reduced'),
  keyword_statement:   _ => kw('statement'),
  keyword_trusted:     _ => kw('trusted'),
  keyword_without:     _ => kw('without'),

  // ── Views ──────────────────────────────────────────────────────────────

  create_view: $ => prec.right(
    seq(
      $.keyword_create,
      optional($._or_replace),
      optional(seq(optional($.keyword_no), $.keyword_force)),
      optional($._temporary),
      optional(choice(
        $.keyword_editioning,
        seq($.keyword_editionable, optional($.keyword_editioning)),
        $.keyword_noneditionable,
      )),
      optional(seq($.keyword_json, $.keyword_collection)),
      optional($.keyword_recursive),
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional($.sharing_clause),
      optional(choice(
        paren_list(choice($.view_column, $.constraint), true),
        // Object view: OF type [UNDER view | WITH OBJECT {IDENTIFIER | ID} {DEFAULT | (expr, …)}]
        seq(
          $.keyword_of, $.object_reference,
          optional(choice(
            seq($.keyword_under, $.object_reference),
            seq(
              $.keyword_with, $.keyword_object,
              choice($.keyword_identifier, $.keyword_id),
              choice($.keyword_default, paren_list($._expression, true)),
            ),
          )),
        ),
      )),
      repeat(choice(
        seq($.keyword_bequeath, choice($.keyword_current_user, $.keyword_definer)),
        seq($.keyword_default, $.keyword_collation, $.identifier),
        $.annotations_clause,
      )),
      $.keyword_as,
      $.create_query,
      optional(
        seq(
          $.keyword_with,
          choice(
            seq(
              optional(choice($.keyword_local, $.keyword_cascaded)),
              $._check_option,
              optional(seq($.keyword_constraint, $.identifier)),
            ),
            seq($.keyword_read, $.keyword_only),
          ),
        ),
      ),
    ),
  ),

  // view column alias with properties: a [VISIBLE | INVISIBLE] [ENCRYPT …] [ANNOTATIONS (…)] [constraint]
  view_column: $ => seq(
    $.identifier,
    repeat(choice(
      $.keyword_visible,
      $.keyword_invisible,
      $._encrypt_clause,
      $.annotations_clause,
      seq(choice($.keyword_unique, $._primary_key), repeat($._constraint_state)),
    )),
  ),

  // ALTER VIEW v {COMPILE | RECOMPILE | READ ONLY | READ WRITE | EDITIONABLE | constraints | …}
  alter_view: $ => seq(
    $.keyword_alter,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    repeat1(choice(
      $.rename_object,
      $.rename_column,
      $.set_schema,
      $.change_ownership,
      seq($.keyword_as, $._dml_read),
      $.keyword_compile,
      $.keyword_recompile,
      seq($.keyword_read, choice($.keyword_only, $.keyword_write)),
      $.keyword_editionable,
      $.keyword_noneditionable,
      $.add_constraint,
      $.add_unnamed_constraint,
      $.drop_constraint,
      $.drop_key_clause,
      $.modify_constraint_clause,
      $.modify_columns_clause,
      $.annotations_clause,
      seq($.keyword_modify, $.keyword_constraint, field('name', $.identifier)),
    )),
  ),

  drop_view: $ => seq(
    $.keyword_drop,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    repeat(choice($._drop_behavior, seq($.keyword_cascade, $.keyword_constraints))),
  ),

  drop_materialized_view: $ => seq(
    $.keyword_drop,
    $.keyword_materialized,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
    optional(seq($.keyword_preserve, $.keyword_table)),
  ),

  // DROP INDEX [IF EXISTS] [schema.]i [ONLINE] [FORCE] [{DEFERRED | IMMEDIATE} INVALIDATION]
  drop_index: $ => seq(
    $.keyword_drop,
    $.keyword_index,
    optional($.keyword_concurrently),
    optional($._if_exists),
    field('name', $.object_reference),
    repeat(choice(
      $._drop_behavior,
      $.keyword_online,
      $.keyword_force,
      seq(choice($.keyword_deferred, $.keyword_immediate), $.keyword_invalidation),
    )),
    optional(
      seq(
        $.keyword_on,
        $.object_reference,
      ),
    ),
  ),

  // ── Materialized views ─────────────────────────────────────────────────

  // REFRESH [FAST | COMPLETE | FORCE] [ON {DEMAND | COMMIT | STATEMENT}] [START WITH …] [NEXT …]
  //   [WITH {PRIMARY KEY | ROWID}] [USING {TRUSTED | ENFORCED} CONSTRAINTS]
  // NEVER REFRESH
  mv_refresh_clause: $ => prec.right(choice(
    seq($.keyword_never, $.keyword_refresh),
    seq(
      $.keyword_refresh,
      repeat1(choice(
        $.keyword_fast,
        $.keyword_complete,
        $.keyword_force,
        seq($.keyword_on, choice($.keyword_demand, $.keyword_commit, $.keyword_statement)),
        seq($.keyword_start, $.keyword_with, $._expression),
        seq($.keyword_next, $._expression),
        seq($.keyword_with, choice(seq($.keyword_primary, $.keyword_key), $.keyword_rowid)),
        seq(choice($.keyword_using, $.keyword_default), $.keyword_master, $.keyword_rollback, $.keyword_segment),
        seq($.keyword_using, choice($.keyword_trusted, $.keyword_enforced), $.keyword_constraints),
      )),
    ),
  )),

  create_materialized_view: $ => prec.right(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_materialized,
    $.keyword_view,
    optional($._if_not_exists),
    $.object_reference,
    repeat(choice(
      paren_list($.mv_column, true),
      seq($.keyword_of, $.object_reference),
      seq(
        $.keyword_on, $.keyword_prebuilt, $.keyword_table,
        optional(seq(choice($.keyword_with, $.keyword_without), $.keyword_reduced, $.keyword_precision)),
      ),
      $._mv_build_clause,
      $.mv_refresh_clause,
      $._mv_query_rewrite,
      $._oracle_physical_attribute,
      $.table_partition_by,
      $.annotations_clause,
      seq($.keyword_default, $.keyword_collation, $.identifier),
      seq($.keyword_evaluate, $.keyword_using, choice(seq($.keyword_current, $.keyword_edition), $.keyword_null, $.identifier)),
      seq($.keyword_using, choice(seq($.keyword_no, $.keyword_index), seq($.keyword_index, repeat($._oracle_physical_attribute)))),
      seq(choice($.keyword_enable, $.keyword_disable), $.keyword_concurrent, $.keyword_refresh),
      seq(choice($.keyword_enable, $.keyword_disable), $.keyword_on, $.keyword_query, $.keyword_computation),
    )),
    $.keyword_as,
    $.create_query,
    optional(seq($.keyword_with, optional($.keyword_no), $.keyword_data)),
  )),

  mv_column: $ => seq(
    $.identifier,
    repeat(choice($._encrypt_clause, $.annotations_clause)),
  ),

  // ── Transaction control ────────────────────────────────────────────────

  _commit: $ => seq(
    $.keyword_commit,
    optional(
      choice(
        $.keyword_transaction,
        $.keyword_work,
      ),
    ),
    optional($._transaction_chain),
    repeat(choice(
      seq($.keyword_comment, alias($._literal_string, $.literal)),
      seq($.keyword_force, alias($._literal_string, $.literal), optional(seq(',', alias($._natural_number, $.literal)))),
      seq($.keyword_write, repeat1(choice($.keyword_wait, $.keyword_nowait, $.keyword_immediate, $.keyword_batch))),
    )),
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
    optional(seq($.keyword_force, alias($._literal_string, $.literal))),
  ),

  // SET CONSTRAINT[S] {ALL | name [, …]} {IMMEDIATE | DEFERRED}
  // SET [LOCAL] TRANSACTION [mode | USE ROLLBACK SEGMENT r | NAME 'n'] …
  // SET SESSION CHARACTERISTICS AS TRANSACTION mode [, …]
  set_statement: $ => seq(
    $.keyword_set,
    choice(
      seq(
        choice($.keyword_constraint, $.keyword_constraints),
        choice($.keyword_all, comma_list($.object_reference, true)),
        choice($.keyword_deferred, $.keyword_immediate),
      ),
      seq(
        optional($.keyword_local),
        $.keyword_transaction,
        repeat(seq(optional(','), $._set_transaction_option)),
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

  _set_transaction_option: $ => choice(
    $.transaction_mode,
    seq($.keyword_use, $.keyword_rollback, $.keyword_segment, $.identifier),
    seq($.keyword_name, alias($._literal_string, $.literal)),
  ),

  _truncate_statement: $ => seq(
    $.keyword_truncate,
    optional($.keyword_table),
    optional($.keyword_only),
    comma_list($.object_reference),
    repeat(choice(
      $._drop_behavior,
      seq(choice($.keyword_preserve, $.keyword_purge), $.keyword_materialized, $.keyword_view, $.keyword_log),
      seq($.keyword_drop, optional($.keyword_all), $.keyword_storage),
      seq($.keyword_reuse, $.keyword_storage),
    )),
  ),

  // LOCK TABLE t [PARTITION (p) | SUBPARTITION (sp)] [, …] IN <lockmode> MODE [NOWAIT | WAIT n]
  lock_table_statement: $ => prec.right(seq(
    $.keyword_lock,
    $.keyword_table,
    comma_list(seq($.object_reference, optional($.partition_extension)), true),
    $.keyword_in,
    field('mode', $._lock_mode),
    $.keyword_mode,
    optional(choice(
      $.keyword_nowait,
      seq($.keyword_wait, alias($._natural_number, $.literal)),
    )),
  )),

  // CALL routine(args) | CALL type(args).method(args) [INTO :host [INDICATOR] :ind]
  call_statement: $ => prec.right(seq(
    $.keyword_call,
    choice($.invocation, $.call_chain),
    optional(seq(
      $.keyword_into,
      field('target', $.parameter),
      optional(seq(optional($.keyword_indicator), $.parameter)),
    )),
  )),

};
