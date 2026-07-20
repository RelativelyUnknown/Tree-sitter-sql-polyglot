import base from '../grammar.js';
import { optional_parenthesis, make_keyword } from '../grammar/helpers.js';
import ch_type_rules    from './grammar/types.js';
import ch_select_rules  from './grammar/select.js';
import ch_create_rules  from './grammar/create.js';
import ch_system_rules  from './grammar/system.js';
import ch_mutation_rules from './grammar/mutations.js';
import ch_access_control_rules from './grammar/access_control.js';

export default grammar(base, {
  name: 'clickhouse_sql',

  conflicts: $ => [
    [$.object_reference, $._qualified_field],
    [$.field, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    [$.between_expression, $.binary_expression],
    [$.from],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.interval],
    // ALTER ... UPDATE col = expr [IN PARTITION p]: after the value expression,
    // `IN` may continue a binary IN-expression or begin the IN PARTITION clause.
    // GLR explores both; only one continuation is well-formed at runtime.
    [$.binary_expression, $.assignment],
    // Access control rules overlap with base create_role/alter_role/create_role
    [$.create_user_statement, $.create_role],
    [$.alter_user_statement, $.alter_role],
    [$.alter_user_statement, $.object_reference],
    [$.create_role_statement, $.create_role],
    [$.ch_grant_statement, $.grant_statement],
    [$.ch_revoke_statement, $.revoke_statement],
  ],

  rules: {

    // ── INSERT: ClickHouse 23.4+ supports INSERT … RETURNING (#119) ─────────
    _insert_statement: $ => seq(
      $.insert,
      optional($.returning),
    ),


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
        $.system_statement,
        $.attach_statement,
        $.detach_statement,
        $.optimize_statement,
        $.kill_query_statement,
        $.kill_mutation_statement,
        $.create_user_statement,
        $.alter_user_statement,
        $.create_role_statement,
        $.ch_grant_statement,
        $.ch_revoke_statement,
        $.create_quota_statement,
        $.create_row_policy_statement,
        $.create_settings_profile_statement,
        $.backup_statement,
        $.restore_statement,
        $.exchange_tables_statement,
        $.show_statement,
      ),
    ),

    // ATTACH / DETACH {TABLE|DICTIONARY|VIEW|DATABASE} name
    attach_statement: $ => seq(
      $.keyword_attach,
      $._attach_target,
    ),

    detach_statement: $ => seq(
      $.keyword_detach,
      $._attach_target,
    ),

    _attach_target: $ => seq(
      choice($.keyword_table, $.keyword_dictionary, $.keyword_view, $.keyword_database),
      optional($._if_exists),
      $.object_reference,
      optional($.on_cluster),
    ),

    // ── ClickHouse keywords (dialect-local, per codebase convention) ──────────
    // Statement / clause keywords
    keyword_show:          _ => token(prec(1, make_keyword("show"))),
    keyword_databases:     _ => token(prec(1, make_keyword("databases"))),
    keyword_processlist:   _ => token(prec(1, make_keyword("processlist"))),
    keyword_granularity:   _ => token(prec(1, make_keyword("granularity"))),
    keyword_engine:        _ => token(prec(1, make_keyword("engine"))),
    keyword_prewhere:      _ => token(prec(1, make_keyword("prewhere"))),
    keyword_final:         _ => token(prec(1, make_keyword("final"))),
    keyword_sample:        _ => token(prec(1, make_keyword("sample"))),
    keyword_totals:        _ => token(prec(1, make_keyword("totals"))),
    keyword_format:        _ => token(prec(1, make_keyword("format"))),
    keyword_settings:      _ => token(prec(1, make_keyword("settings"))),
    keyword_dictionary:    _ => token(prec(1, make_keyword("dictionary"))),
    keyword_dictionaries:  _ => token(prec(1, make_keyword("dictionaries"))),
    keyword_live:          _ => token(prec(1, make_keyword("live"))),
    keyword_populate:      _ => token(prec(1, make_keyword("populate"))),
    keyword_cluster:       _ => token(prec(1, make_keyword("cluster"))),
    keyword_ttl:           _ => token(prec(1, make_keyword("ttl"))),
    keyword_disk:          _ => token(prec(1, make_keyword("disk"))),
    keyword_volume:        _ => token(prec(1, make_keyword("volume"))),
    keyword_attach:        _ => token(prec(1, make_keyword("attach"))),
    keyword_detach:        _ => token(prec(1, make_keyword("detach"))),
    keyword_source:        _ => token(prec(1, make_keyword("source"))),
    keyword_layout:        _ => token(prec(1, make_keyword("layout"))),
    keyword_lifetime:      _ => token(prec(1, make_keyword("lifetime"))),
    keyword_min:           _ => token(prec(1, make_keyword("min"))),
    keyword_max:           _ => token(prec(1, make_keyword("max"))),

    // Column modifiers / DDL extensions
    keyword_codec:         _ => token(prec(1, make_keyword("codec"))),
    keyword_alias:         _ => token(prec(1, make_keyword("alias"))),
    keyword_ephemeral:     _ => token(prec(1, make_keyword("ephemeral"))),

    // Mutations / OPTIMIZE
    keyword_optimize:      _ => token(prec(1, make_keyword("optimize"))),
    keyword_deduplicate:   _ => token(prec(1, make_keyword("deduplicate"))),
    keyword_freeze:        _ => token(prec(1, make_keyword("freeze"))),
    keyword_materialize:   _ => token(prec(1, make_keyword("materialize"))),
    // Re-declared at prec(1) so maximal munch keeps MATERIALIZED intact:
    // keyword_materialize (prec 1) would otherwise shadow the longer
    // MATERIALIZED (prefix-shadowing bug — precedence beats length).
    keyword_materialized:  _ => token(prec(1, make_keyword("materialized"))),
    keyword_clear:         _ => token(prec(1, make_keyword("clear"))),

    // SELECT extensions
    keyword_qualify:       _ => token(prec(1, make_keyword("qualify"))),
    keyword_fill:          _ => token(prec(1, make_keyword("fill"))),
    keyword_step:          _ => token(prec(1, make_keyword("step"))),
    keyword_outfile:       _ => token(prec(1, make_keyword("outfile"))),

    // Access control / KILL keywords
    keyword_kill:          _ => token(prec(1, make_keyword("kill"))),
    keyword_query:         _ => token(prec(1, make_keyword("query"))),
    keyword_mutation:      _ => token(prec(1, make_keyword("mutation"))),
    keyword_identified:    _ => token(prec(1, make_keyword("identified"))),
    keyword_quota:         _ => token(prec(1, make_keyword("quota"))),
    keyword_keyed:         _ => token(prec(1, make_keyword("keyed"))),
    keyword_row:           _ => token(prec(1, make_keyword("row"))),
    keyword_policy:        _ => token(prec(1, make_keyword("policy"))),
    keyword_permissive:    _ => token(prec(1, make_keyword("permissive"))),
    keyword_restrictive:   _ => token(prec(1, make_keyword("restrictive"))),
    keyword_profile:       _ => token(prec(1, make_keyword("profile"))),
    keyword_backup:        _ => token(prec(1, make_keyword("backup"))),
    keyword_restore:       _ => token(prec(1, make_keyword("restore"))),
    keyword_exchange:      _ => token(prec(1, make_keyword("exchange"))),
    keyword_unfreeze:      _ => token(prec(1, make_keyword("unfreeze"))),
    keyword_name:          _ => token(prec(1, make_keyword("name"))),
    keyword_host:          _ => token(prec(1, make_keyword("host"))),
    keyword_ip:            _ => token(prec(1, make_keyword("ip"))),
    keyword_async:         _ => token(prec(1, make_keyword("async"))),
    keyword_test:          _ => token(prec(1, make_keyword("test"))),

    // SYSTEM command keywords
    keyword_system:        _ => token(prec(1, make_keyword("system"))),
    keyword_flush:         _ => token(prec(1, make_keyword("flush"))),
    keyword_logs:          _ => token(prec(1, make_keyword("logs"))),
    keyword_reload:        _ => token(prec(1, make_keyword("reload"))),
    keyword_config:        _ => token(prec(1, make_keyword("config"))),
    keyword_dns:           _ => token(prec(1, make_keyword("dns"))),
    keyword_cache:         _ => token(prec(1, make_keyword("cache"))),
    keyword_merges:        _ => token(prec(1, make_keyword("merges"))),
    keyword_fetches:       _ => token(prec(1, make_keyword("fetches"))),
    keyword_replicated:    _ => token(prec(1, make_keyword("replicated"))),
    keyword_sends:         _ => token(prec(1, make_keyword("sends"))),
    keyword_distributed:   _ => token(prec(1, make_keyword("distributed"))),
    keyword_sync:          _ => token(prec(1, make_keyword("sync"))),
    keyword_replica:       _ => token(prec(1, make_keyword("replica"))),
    keyword_stop:          _ => token(prec(1, make_keyword("stop"))),
    keyword_start:         _ => token(prec(1, make_keyword("start"))),

    // Type keywords (parametric)
    keyword_map:           _ => token(prec(1, make_keyword("map"))),
    keyword_tuple:         _ => token(prec(1, make_keyword("tuple"))),
    keyword_nested:        _ => token(prec(1, make_keyword("nested"))),
    keyword_lowcardinality:_ => token(prec(1, make_keyword("lowcardinality"))),
    keyword_nullable:      _ => token(prec(1, make_keyword("nullable"))),
    keyword_fixedstring:   _ => token(prec(1, make_keyword("fixedstring"))),

    // Type keywords (native scalars). Prefix-shadowing note: equal prec(1) +
    // longest-match means e.g. UInt256 wins over UInt2/UInt16-prefix; all are
    // distinct whole tokens (no partial matches) so token(prec(1)) is consistent.
    keyword_uint8:         _ => token(prec(1, make_keyword("uint8"))),
    keyword_uint16:        _ => token(prec(1, make_keyword("uint16"))),
    keyword_uint32:        _ => token(prec(1, make_keyword("uint32"))),
    keyword_uint64:        _ => token(prec(1, make_keyword("uint64"))),
    keyword_uint128:       _ => token(prec(1, make_keyword("uint128"))),
    keyword_uint256:       _ => token(prec(1, make_keyword("uint256"))),
    keyword_int8:          _ => token(prec(1, make_keyword("int8"))),
    keyword_int16:         _ => token(prec(1, make_keyword("int16"))),
    keyword_int32:         _ => token(prec(1, make_keyword("int32"))),
    keyword_int64:         _ => token(prec(1, make_keyword("int64"))),
    keyword_int128:        _ => token(prec(1, make_keyword("int128"))),
    keyword_int256:        _ => token(prec(1, make_keyword("int256"))),
    keyword_float32:       _ => token(prec(1, make_keyword("float32"))),
    keyword_float64:       _ => token(prec(1, make_keyword("float64"))),
    keyword_uuid:          _ => token(prec(1, make_keyword("uuid"))),
    keyword_ipv4:          _ => token(prec(1, make_keyword("ipv4"))),
    keyword_ipv6:          _ => token(prec(1, make_keyword("ipv6"))),
    keyword_date32:        _ => token(prec(1, make_keyword("date32"))),
    keyword_datetime:      _ => token(prec(1, make_keyword("datetime"))),
    keyword_datetime64:    _ => token(prec(1, make_keyword("datetime64"))),

    ...ch_type_rules,
    ...ch_select_rules,
    ...ch_create_rules,
    ...ch_system_rules,
    ...ch_mutation_rules,
    ...ch_access_control_rules,


    // Lexer-precedence guards: this dialect declares token(prec(1)) keywords
    // that are strict prefixes of the base keywords below. Explicit precedence
    // beats match length in the tree-sitter lexer, so without an equal-prec
    // re-declaration the longer keyword becomes unlexable in this dialect.
    keyword_maxvalue: _ => token(prec(1, make_keyword("maxvalue"))),
    keyword_minvalue: _ => token(prec(1, make_keyword("minvalue"))),
    keyword_rows: _ => token(prec(1, make_keyword("rows"))),

  },
});
