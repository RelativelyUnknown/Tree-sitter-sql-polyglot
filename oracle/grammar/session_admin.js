import { make_keyword } from '../../grammar/helpers.js';
import admin_rules from './admin.js';

// ALTER SESSION and ALTER SYSTEM (Oracle SQL Language Reference 26ai). ALTER SESSION replaces the
// earlier rule and keeps its forms; ALTER SYSTEM keeps the earlier rule and adds the missing ones.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_active:     _ => kw('active'),
  keyword_advise:     _ => kw('advise'),
  keyword_archival:   _ => kw('archival'),
  keyword_ddl:        _ => kw('ddl'),
  keyword_guard:      _ => kw('guard'),
  keyword_resumable:  _ => kw('resumable'),
  keyword_sync:       _ => kw('sync'),
  keyword_timeout:    _ => kw('timeout'),
  keyword_visibility: _ => kw('visibility'),

  alter_session_statement: $ => prec.right(seq(
    $.keyword_alter,
    $.keyword_session,
    choice(
      seq(
        $.keyword_set,
        repeat1(seq(
          field('parameter', $.identifier),
          '=',
          field('value', choice($._expression, $.keyword_serializable)),
        )),
      ),
      seq($.keyword_set, $.keyword_row, $.keyword_archival, $.keyword_visibility, '=', choice($.keyword_active, $.keyword_all)),
      seq(
        choice($.keyword_enable, $.keyword_disable, $.keyword_force),
        $.keyword_parallel,
        $.identifier,
        optional(seq($.keyword_parallel, alias($._natural_number, $.literal))),
      ),
      seq($.keyword_advise, choice($.keyword_commit, $.keyword_rollback, $.keyword_nothing)),
      seq($.keyword_close, $.keyword_database, $.keyword_link, $.identifier),
      seq(choice($.keyword_enable, $.keyword_disable), $.keyword_commit, $.keyword_in, $.keyword_procedure),
      seq(choice($.keyword_enable, $.keyword_disable), $.keyword_guard),
      seq(
        choice($.keyword_enable, $.keyword_disable), $.keyword_resumable,
        optional(seq($.keyword_timeout, alias($._natural_number, $.literal))),
        optional(seq($.keyword_name, alias($._literal_string, $.literal))),
      ),
      seq(choice($.keyword_enable, $.keyword_disable), $.keyword_shard, $.keyword_ddl),
      seq($.keyword_sync, $.keyword_with, $.keyword_primary),
    ),
  )),

  _legacy_alter_system: admin_rules.alter_system_statement,

  alter_system_statement: $ => choice(
    $._legacy_alter_system,
    prec.right(seq(
      $.keyword_alter,
      $.keyword_system,
      choice(
        seq($.keyword_checkpoint, choice($.keyword_global, $.keyword_local)),
        seq(choice($.keyword_enable, $.keyword_disable), $.keyword_restricted, $.keyword_session),
        seq(
          $.keyword_reset, $.identifier,
          optional(seq($.keyword_scope, '=', choice($.keyword_memory, $.keyword_spfile, $.keyword_both))),
        ),
      ),
    )),
  ),

};
