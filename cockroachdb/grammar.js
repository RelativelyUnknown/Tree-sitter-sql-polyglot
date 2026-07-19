import postgres from '../postgres/grammar.js';
import { comma_list, optional_parenthesis, wrapped_in_parenthesis, make_keyword } from '../grammar/helpers.js';
import crdb_statement_rules from './grammar/statements.js';

// CockroachDB SQL — PostgreSQL-compatible by design (wire protocol and
// syntax), layered on the postgres grammar. Adds the CockroachDB-native
// distributed-SQL surface: AS OF SYSTEM TIME, UPSERT, BACKUP/RESTORE,
// IMPORT INTO, CREATE CHANGEFEED, hash-sharded indexes, SHOW statements.
export default grammar(postgres, {
  name: 'cockroachdb_sql',

  // conflicts do not propagate from the parent — postgres's list is copied
  // verbatim, followed by CockroachDB-specific entries.
  conflicts: $ => [
    [$.object_reference, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    [$.between_expression, $.binary_expression],
    [$.time],
    [$.timestamp],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.interval],
  ],

  rules: {

    // postgres statement dispatch plus CockroachDB statement forms
    statement: $ => seq(
      optional(seq(
        $.keyword_explain,
        optional(choice(
          seq($.keyword_analyze, optional($.keyword_verbose)),
          $.keyword_verbose,
          $.explain_options,
        )),
      )),
      choice(
        $._ddl_statement,
        $._dml_write,
        optional_parenthesis($._dml_read),
        $._transaction_statement,
        $.backup_statement,
        $.restore_statement,
        $.import_into_statement,
        $.create_changefeed_statement,
      ),
    ),

    // postgres _dml_write plus UPSERT
    _dml_write: $ => seq(
      optional($._cte),
      choice(
        $._delete_statement,
        $._insert_statement,
        $._update_statement,
        $._truncate_statement,
        $._copy_statement,
        $.upsert_statement,
      ),
    ),

    // base relation plus optional AS OF SYSTEM TIME on a table reference.
    // Placed inside relation (before the alias) so the token after AS
    // disambiguates: OF → historical read, identifier → alias.
    relation: $ => prec.right(
      seq(
        choice(
          $.subquery,
          $.invocation,
          $.object_reference,
          wrapped_in_parenthesis($.values),
        ),
        optional($.tablesample),
        optional($.as_of_clause),
        optional(
          seq(
            $._alias,
            optional(alias($._column_list, $.list)),
          ),
        ),
      ),
    ),

    // postgres create_index plus hash-sharded indexes and STORING
    create_index: $ => seq(
      $.keyword_create,
      optional($.keyword_unique),
      $.keyword_index,
      optional($.keyword_concurrently),
      optional(
        seq(
          optional($._if_not_exists),
          field('column', $._column),
        ),
      ),
      $.keyword_on,
      optional($.keyword_only),
      seq(
        $.object_reference,
        optional(
          seq(
            $.keyword_using,
            choice(
              $.keyword_btree,
              $.keyword_hash,
              $.keyword_gist,
              $.keyword_spgist,
              $.keyword_gin,
              $.keyword_brin,
              field('index_type', $.identifier),
            ),
          ),
        ),
        $.index_fields,
      ),
      // CockroachDB: hash-sharded index
      optional(seq(
        $.keyword_using,
        $.keyword_hash,
        optional($.crdb_options_clause),
      )),
      // CockroachDB: STORING (col, ...) — non-key covered columns
      optional(seq(
        $.keyword_storing,
        alias($._column_list, $.list),
      )),
      optional($.covering_columns),
      optional($.tablespace),
      optional($.where),
    ),

    // CockroachDB-specific keywords (dialect-level per AGENTS.md; token(prec(1))
    // biases the lexer over plain identifiers)
    keyword_backup:     _ => token(prec(1, make_keyword("backup"))),
    keyword_restore:    _ => token(prec(1, make_keyword("restore"))),
    keyword_import:     _ => token(prec(1, make_keyword("import"))),
    keyword_changefeed: _ => token(prec(1, make_keyword("changefeed"))),
    keyword_upsert:     _ => token(prec(1, make_keyword("upsert"))),
    keyword_latest:     _ => token(prec(1, make_keyword("latest"))),
    keyword_csv:        _ => token(prec(1, make_keyword("csv"))),
    keyword_system:     _ => token(prec(1, make_keyword("system"))),
    keyword_jobs:       _ => token(prec(1, make_keyword("jobs"))),
    keyword_users:      _ => token(prec(1, make_keyword("users"))),
    keyword_databases:  _ => token(prec(1, make_keyword("databases"))),
    keyword_grants:     _ => token(prec(1, make_keyword("grants"))),
    keyword_columns:    _ => token(prec(1, make_keyword("columns"))),
    keyword_storing:    _ => token(prec(1, make_keyword("storing"))),

    ...crdb_statement_rules,

  },
});
