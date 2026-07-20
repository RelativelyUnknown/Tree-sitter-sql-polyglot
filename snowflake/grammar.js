import base from '../grammar.js';
import { paren_list, optional_parenthesis, comma_list, wrapped_in_parenthesis, make_keyword } from '../grammar/helpers.js';

import qualify_rules     from './grammar/qualify.js';
import pivot_rules       from './grammar/pivot.js';
import match_rec_rules   from './grammar/match_recognize.js';
import time_travel_rules from './grammar/time_travel.js';
import variant_rules     from './grammar/variant.js';
import scripting_rules   from './grammar/scripting.js';
import execute_rules     from './grammar/execute.js';
import copy_rules        from './grammar/copy.js';
import create_rules      from './grammar/create.js';
import alter_rules       from './grammar/alter.js';
import use_rules         from './grammar/use.js';
import stage_rules       from './grammar/stage.js';
import show_rules        from './grammar/show.js';

export default grammar(base, {
  name: 'snowflake_sql',

  conflicts: $ => [
    // Inherited base conflicts
    [$.object_reference, $._qualified_field],
    [$.field, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    [$.between_expression, $.binary_expression],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.interval],
    // Snowflake-specific conflicts
    [$._function_return, $.return_statement],
    [$.time],
    [$.timestamp],
  ],

  rules: {

    // ── Program: add scripting top-level blocks ─────────────────────────────
    program: $ => seq(
      repeat(seq(
        choice(
          $.transaction,
          $.statement,
          $.declare_block,
          $.compound_statement,
        ),
        ';',
      )),
      optional($.statement),
    ),

    // ── Statement: add scripting statements ────────────────────────────────
    statement: $ => seq(
      optional(seq(
        $.keyword_explain,
        optional($.keyword_analyze),
        optional($.keyword_verbose),
      )),
      choice(
        $._ddl_statement,
        $._dml_write,
        optional_parenthesis($._dml_read),
        $._transaction_statement,
        $.let_statement,
        $.return_statement,
        $.raise_statement,
        $.for_statement,
        $.undrop_statement,
        $.call_statement,
      ),
    ),

    // ── DDL: add Snowflake-specific statements ──────────────────────────────
    _ddl_statement: $ => choice(
      // base ANSI DDL
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $._rename_statement,
      $._merge_statement,
      $._refresh_statement,
      $.set_statement,
      $.grant_statement,
      $.revoke_statement,
      // Snowflake additions
      $.execute_immediate_statement,
      $.execute_task,
      $.copy_into,
      $.use_statement,
      $.use_secondary_roles,
      $.list_stage_statement,
      $.show_statement,
      $.describe_statement,
      $.comment_statement,
    ),

    // ── SELECT … FOR UPDATE [NOWAIT | WAIT <n>] (hybrid tables) ────────────
    _select_statement: $ => optional_parenthesis(
      seq(
        $.select,
        optional(
          seq(
            $.keyword_into,
            $.select_expression,
          ),
        ),
        optional($.from),
        optional($.locking_clause),
      ),
    ),

    locking_clause: $ => seq(
      $.keyword_for,
      $.keyword_update,
      optional(
        choice(
          $.keyword_nowait,
          seq($.keyword_wait, alias($._integer, $.literal)),
        ),
      ),
    ),

    // ── DROP: add DROP STAGE ────────────────────────────────────────────────
    _drop_statement: $ => seq(
      choice(
        $.drop_table,
        $.drop_view,
        $.drop_materialized_view,
        $.drop_index,
        $.drop_function,
        $.drop_procedure,
        $.drop_type,
        $.drop_database,
        $.drop_role,
        $.drop_schema,
        $.drop_sequence,
        $.drop_stage,
      ),
    ),

    // ── CREATE: add Snowflake CREATE types ─────────────────────────────────
    _create_statement: $ => seq(
      choice(
        // base (re-enumerated from grammar/statements/create.js)
        $.create_table,
        $.create_view,
        $.create_materialized_view,
        $.create_index,
        $.create_function,
        $.create_procedure,
        $.create_type,
        $.create_database,
        $.create_role,
        $.create_sequence,
        $.create_trigger,
        prec.left(seq(
          $.create_schema,
          repeat($._create_statement),
        )),
        // Snowflake-specific
        $.create_stream,
        $.create_task,
        $.create_dynamic_table,
        $.create_secure_view,
        $.create_masking_policy,
        $.create_row_access_policy,
        $.create_stage,
        $.create_warehouse_statement,
        $.create_file_format_statement,
        $.create_external_table,
      ),
    ),

    // ── ALTER: add ALTER SESSION + masking policy alter ─────────────────────
    _alter_statement: $ => seq(
      choice(
        // base (re-enumerated from grammar/statements/alter.js)
        $.alter_table,
        $.alter_view,
        $.alter_materialized_view,
        $.alter_schema,
        $.alter_type,
        $.alter_index,
        $.alter_database,
        $.alter_role,
        $.alter_sequence,
        // Snowflake-specific
        $.alter_session,
        $.alter_table_masking,
        $.alter_stage,
        $.alter_warehouse_statement,
        $.alter_table_cluster,
      ),
    ),

    // ── DML: add RETURNING to INSERT / UPDATE / DELETE (#116) ───────────────
    _insert_statement: $ => seq(
      $.insert,
      optional($.returning),
    ),

    _update_statement: $ => seq(
      $.update,
      optional($.returning),
    ),

    _delete_statement: $ => seq(
      $.delete,
      alias($._delete_from, $.from),
      optional($.returning),
    ),

    // ── CALL: invoke a stored procedure ─────────────────────────────────────
    call_statement: $ => seq(
      $.keyword_call,
      field('procedure', $.object_reference),
      paren_list($._expression),
    ),

    // ── INSERT: add Snowflake INSERT OVERWRITE INTO ─────────────────────────
    insert: $ => seq(
      $.keyword_insert,
      optional($.keyword_overwrite),
      optional($.keyword_into),
      $.object_reference,
      optional(
        seq(
          $.keyword_as,
          field('alias', $.identifier)
        ),
      ),
      choice(
        $._insert_values,
        $._set_values,
      ),
    ),

    // ── CREATE TABLE: add CLONE clause ──────────────────────────────────────
    create_table: $ => prec.left(
      seq(
        $.keyword_create,
        optional(choice($._temporary, $.keyword_unlogged)),
        $.keyword_table,
        optional($._if_not_exists),
        $.object_reference,
        choice(
          seq(
            optional($.column_definitions),
            optional($.clone_clause),
            optional(seq($.keyword_as, $.create_query)),
          ),
          $.clone_clause,
        ),
      ),
    ),

    // ── CREATE SCHEMA: add CLONE clause ─────────────────────────────────────
    create_schema: $ => prec.left(seq(
      $.keyword_create,
      $.keyword_schema,
      choice(
        seq(
          optional($._if_not_exists),
          $.identifier,
          optional(seq($.keyword_authorization, $.identifier)),
          optional($.clone_clause),
        ),
        seq(
          $.keyword_authorization,
          $.identifier,
          optional($.clone_clause),
        ),
      ),
    )),

    // ── CREATE DATABASE: add CLONE clause ───────────────────────────────────
    create_database: $ => prec.left(seq(
      $.keyword_create,
      $.keyword_database,
      optional($._if_not_exists),
      $.identifier,
      optional($.keyword_with),
      repeat($._with_settings),
      optional($.clone_clause),
    )),

    // ── SELECT / FROM: add QUALIFY after HAVING ─────────────────────────────
    from: $ => seq(
      $.keyword_from,
      optional($.keyword_only),
      comma_list($.relation, true),
      optional($.index_hint),
      repeat(choice(
        $.join,
        $.cross_join,
        $.lateral_join,
        $.lateral_cross_join,
      )),
      optional($.where),
      optional($.group_by),
      optional($.having),
      optional($.qualify),
      optional($.window_clause),
      optional($.order_by),
      optional($.limit),
      optional($.offset_fetch_clause),
    ),

    // ── relation: add time travel, PIVOT, UNPIVOT, MATCH_RECOGNIZE ──────────
    relation: $ => prec.right(
      seq(
        choice(
          $.subquery,
          $.invocation,
          $.object_reference,
          wrapped_in_parenthesis($.values),
          // Snowflake: @stage as a FROM source
          $.stage_ref,
        ),
        optional($.time_travel_clause),
        optional($.tablesample),
        optional(choice(
          $.pivot_clause,
          $.unpivot_clause,
        )),
        optional($.match_recognize_clause),
        optional(seq(
          $._alias,
          optional(alias($._column_list, $.list)),
        )),
      ),
    ),

    // ── _expression: add variant colon-path access and :: cast ──────────────
    _expression: $ => prec(1, choice(
      $.literal,
      alias($._qualified_field, $.field),
      $.parameter,
      $.list,
      $.case,
      $.window_function,
      $.subquery,
      $.cast,
      alias($._colon_cast, $.cast),
      $.exists,
      $.invocation,
      $.binary_expression,
      $.subscript,
      $.unary_expression,
      $.array,
      $.interval,
      $.between_expression,
      $.parenthesized_expression,
      // Snowflake-specific
      $.variant_access,
    )),

    // ── :: type cast (Snowflake-specific; Postgres has same pattern) ─────────
    _colon_cast: $ => seq(
      $._expression,
      '::',
      $._type,
    ),

    // Snowflake-specific keywords (not ANSI)
    keyword_at:             _ => token(prec(1, make_keyword("at"))),
    keyword_one:            _ => token(prec(1, make_keyword("one"))),
    keyword_per:            _ => token(prec(1, make_keyword("per"))),
    keyword_past:           _ => token(prec(1, make_keyword("past"))),
    keyword_next:           _ => token(prec(1, make_keyword("next"))),
    keyword_match_recognize:_ => token(prec(1, make_keyword("match_recognize"))),
    keyword_measures:       _ => token(prec(1, make_keyword("measures"))),
    keyword_pattern:        _ => token(prec(1, make_keyword("pattern"))),
    keyword_define:         _ => token(prec(1, make_keyword("define"))),
    keyword_skip:           _ => token(prec(1, make_keyword("skip"))),
    keyword_flatten:        _ => token(prec(1, make_keyword("flatten"))),
    keyword_let:            _ => token(prec(1, make_keyword("let"))),
    keyword_raise:          _ => token(prec(1, make_keyword("raise"))),
    keyword_exception:      _ => token(prec(1, make_keyword("exception"))),
    keyword_task:           _ => token(prec(1, make_keyword("task"))),
    keyword_stream:         _ => token(prec(1, make_keyword("stream"))),
    keyword_dynamic:        _ => token(prec(1, make_keyword("dynamic"))),
    keyword_warehouse:      _ => token(prec(1, make_keyword("warehouse"))),
    keyword_clone:             _ => token(prec(1, make_keyword("clone"))),
    keyword_undrop:            _ => token(prec(1, make_keyword("undrop"))),
    keyword_warehouse_size:    _ => token(prec(1, /[Ww][Aa][Rr][Ee][Hh][Oo][Uu][Ss][Ee]_[Ss][Ii][Zz][Ee]/)),
    keyword_max_cluster_count: _ => token(prec(1, /[Mm][Aa][Xx]_[Cc][Ll][Uu][Ss][Tt][Ee][Rr]_[Cc][Oo][Uu][Nn][Tt]/)),
    keyword_min_cluster_count: _ => token(prec(1, /[Mm][Ii][Nn]_[Cc][Ll][Uu][Ss][Tt][Ee][Rr]_[Cc][Oo][Uu][Nn][Tt]/)),
    keyword_scaling_policy:    _ => token(prec(1, /[Ss][Cc][Aa][Ll][Ii][Nn][Gg]_[Pp][Oo][Ll][Ii][Cc][Yy]/)),
    keyword_standard:          _ => token(prec(1, make_keyword("standard"))),
    keyword_economy:           _ => token(prec(1, make_keyword("economy"))),
    keyword_auto_suspend:      _ => token(prec(1, /[Aa][Uu][Tt][Oo]_[Ss][Uu][Ss][Pp][Ee][Nn][Dd]/)),
    keyword_auto_resume:       _ => token(prec(1, /[Aa][Uu][Tt][Oo]_[Rr][Ee][Ss][Uu][Mm][Ee]/)),
    keyword_suspend:           _ => token(prec(1, make_keyword("suspend"))),
    keyword_resume:            _ => token(prec(1, make_keyword("resume"))),
    keyword_abort:             _ => token(prec(1, make_keyword("abort"))),
    keyword_queries:           _ => token(prec(1, make_keyword("queries"))),
    keyword_schedule:       _ => token(prec(1, make_keyword("schedule"))),
    keyword_secure:         _ => token(prec(1, make_keyword("secure"))),
    keyword_masking:        _ => token(prec(1, make_keyword("masking"))),
    keyword_target_lag:     _ => token(prec(1, make_keyword("target_lag"))),
    keyword_access:         _ => token(prec(1, make_keyword("access"))),
    keyword_secondary:      _ => token(prec(1, make_keyword("secondary"))),
    keyword_roles:          _ => token(prec(1, make_keyword("roles"))),
    keyword_source:         _ => token(prec(1, make_keyword("source"))),
    keyword_qualify:        _ => token(prec(1, make_keyword("qualify"))),
    keyword_pivot:          _ => token(prec(1, make_keyword("pivot"))),
    keyword_unpivot:        _ => token(prec(1, make_keyword("unpivot"))),
    keyword_string:         _ => token(prec(1, make_keyword("string"))),
    keyword_rlike:          _ => token(prec(1, choice(make_keyword("rlike"), make_keyword("regexp")))),
    keyword_copy:           _ => token(prec(1, make_keyword("copy"))),
    keyword_policy:         _ => token(prec(1, make_keyword("policy"))),
    keyword_declare:        _ => token(prec(1, make_keyword("declare"))),
    keyword_match:          _ => token(prec(1, make_keyword("match"))),
    keyword_stage:          _ => token(prec(1, make_keyword("stage"))),
    keyword_url:            _ => token(prec(1, make_keyword("url"))),
    keyword_credentials:    _ => token(prec(1, make_keyword("credentials"))),
    keyword_file_format:    _ => token(prec(1, /[Ff][Ii][Ll][Ee]_[Ff][Oo][Rr][Mm][Aa][Tt]/)),
    keyword_copy_options:   _ => token(prec(1, /[Cc][Oo][Pp][Yy]_[Oo][Pp][Tt][Ii][Oo][Nn][Ss]/)),
    keyword_directory:      _ => token(prec(1, make_keyword("directory"))),
    keyword_encryption:     _ => token(prec(1, make_keyword("encryption"))),
    keyword_pattern:        _ => token(prec(1, make_keyword("pattern"))),
    keyword_list:           _ => token(prec(1, make_keyword("list"))),
    keyword_call:           _ => token(prec(1, make_keyword("call"))),
    keyword_overwrite:      _ => token(prec(1, make_keyword("overwrite"))),
    keyword_location:       _ => token(prec(1, make_keyword("location"))),
    keyword_cluster:        _ => token(prec(1, make_keyword("cluster"))),
    keyword_clustering:     _ => token(prec(1, make_keyword("clustering"))),

    // SHOW / DESCRIBE keywords
    keyword_show:           _ => token(prec(1, make_keyword("show"))),
    keyword_terse:          _ => token(prec(1, make_keyword("terse"))),
    keyword_grants:         _ => token(prec(1, make_keyword("grants"))),
    keyword_users:          _ => token(prec(1, make_keyword("users"))),
    keyword_pipes:          _ => token(prec(1, make_keyword("pipes"))),
    keyword_integrations:   _ => token(prec(1, make_keyword("integrations"))),
    keyword_transactions:   _ => token(prec(1, make_keyword("transactions"))),
    keyword_locks:          _ => token(prec(1, make_keyword("locks"))),
    keyword_starts:         _ => token(prec(1, make_keyword("starts"))),
    keyword_account:        _ => token(prec(1, make_keyword("account"))),
    keyword_describe:       _ => token(prec(1, make_keyword("describe"))),
    keyword_desc:           _ => token(prec(1, make_keyword("desc"))),
    keyword_file:           _ => token(prec(1, make_keyword("file"))),
    keyword_format:         _ => token(prec(1, make_keyword("format"))),
    keyword_formats:        _ => token(prec(1, make_keyword("formats"))),
    keyword_pipe:           _ => token(prec(1, make_keyword("pipe"))),
    keyword_integration:    _ => token(prec(1, make_keyword("integration"))),
    keyword_parameters:     _ => token(prec(1, make_keyword("parameters"))),
    keyword_views:          _ => token(prec(1, make_keyword("views"))),
    keyword_columns:        _ => token(prec(1, make_keyword("columns"))),
    keyword_schemas:        _ => token(prec(1, make_keyword("schemas"))),
    keyword_databases:      _ => token(prec(1, make_keyword("databases"))),
    keyword_warehouses:     _ => token(prec(1, make_keyword("warehouses"))),
    keyword_stages:         _ => token(prec(1, make_keyword("stages"))),
    keyword_streams:        _ => token(prec(1, make_keyword("streams"))),
    keyword_tasks:          _ => token(prec(1, make_keyword("tasks"))),
    keyword_functions:      _ => token(prec(1, make_keyword("functions"))),
    keyword_procedures:     _ => token(prec(1, make_keyword("procedures"))),
    keyword_sequences:      _ => token(prec(1, make_keyword("sequences"))),
    keyword_policies:       _ => token(prec(1, make_keyword("policies"))),

    // ── Spread all Snowflake rule modules ───────────────────────────────────
    ...qualify_rules,
    ...pivot_rules,
    ...match_rec_rules,
    ...time_travel_rules,
    ...variant_rules,
    ...scripting_rules,
    ...execute_rules,
    ...copy_rules,
    ...create_rules,
    ...alter_rules,
    ...use_rules,
    ...stage_rules,
    ...show_rules,


    // Lexer-precedence guards: this dialect declares token(prec(1)) keywords
    // that are strict prefixes of the base keywords below. Explicit precedence
    // beats match length in the tree-sitter lexer, so without an equal-prec
    // re-declaration the longer keyword becomes unlexable in this dialect.
    keyword_attribute: _ => token(prec(1, make_keyword("attribute"))),
    keyword_atomic: _ => token(prec(1, make_keyword("atomic"))),
    keyword_called: _ => token(prec(1, make_keyword("called"))),
    keyword_definer: _ => token(prec(1, make_keyword("definer"))),
    keyword_matched: _ => token(prec(1, make_keyword("matched"))),
    keyword_percent: _ => token(prec(1, make_keyword("percent"))),

  },
});
