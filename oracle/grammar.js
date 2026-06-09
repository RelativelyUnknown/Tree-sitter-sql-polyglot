import base from '../grammar.js';
import { optional_parenthesis, comma_list, make_keyword, wrapped_in_parenthesis } from '../grammar/helpers.js';
import oracle_hierarchical_rules from './grammar/hierarchical.js';
import oracle_plsql_rules from './grammar/plsql_blocks.js';
import oracle_bulk_rules from './grammar/bulk_ops.js';
import oracle_merge_rules from './grammar/merge_ext.js';
import oracle_cursor_rules from './grammar/cursor.js';
import oracle_package_rules from './grammar/package.js';
import oracle_procedural_rules from './grammar/procedural.js';
import oracle_type_rules from './grammar/types.js';
import oracle_hint_rules from './grammar/hints.js';
import oracle_partition_rules from './grammar/partition.js';
import oracle_ddl_ext_rules from './grammar/ddl_ext.js';

export default grammar(base, {
  name: 'oracle_sql',

  precedences: $ => [
    [
      'binary_is',
      'unary_not',
      'binary_exp',
      'binary_times',
      'binary_plus',
      'unary_other',
      'unary_prior',
      'binary_other',
      'binary_in',
      'binary_compare',
      'binary_relation',
      'pattern_matching',
      'between',
      'clause_connective',
      'clause_disjunctive',
    ],
  ],

  conflicts: $ => [
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
    [$.assignment_statement, $._qualified_field],
    [$._function_return, $.return_statement],
    [$.cursor_for_loop, $.for_statement],
    [$.pragma_statement, $._qualified_field],
  ],

  rules: {

    // Extend _create_statement to add CREATE PACKAGE / PACKAGE BODY / SYNONYM / DATABASE LINK
    _create_statement: $ => seq(
      choice(
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
        $.create_package,
        $.create_package_body,
        $.create_synonym_statement,
        $.create_database_link_statement,
        prec.left(seq(
          $.create_schema,
          repeat($._create_statement),
        )),
      ),
    ),

    // Extend _drop_statement to add DROP PACKAGE / SYNONYM
    _drop_statement: $ => seq(
      choice(
        $.drop_table,
        $.drop_view,
        $.drop_materialized_view,
        $.drop_index,
        $.drop_type,
        $.drop_schema,
        $.drop_database,
        $.drop_role,
        $.drop_sequence,
        $.drop_function,
        $.drop_procedure,
        $.drop_package,
        $.drop_synonym_statement,
      ),
    ),

    // Extend statement to add PL/SQL blocks, FORALL, EXECUTE IMMEDIATE, cursors,
    // procedural control-flow (IF/WHILE/LOOP/FOR/RETURN/EXIT/CONTINUE/NULL/ASSIGN)
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
        $.compound_statement,
        $.forall_statement,
        $.execute_immediate_statement,
        $.cursor_for_loop,
        $.cursor_open_statement,
        $.cursor_fetch_statement,
        $.cursor_close_statement,
        // Procedural control-flow
        $.if_statement,
        $.while_statement,
        $.loop_statement,
        $.for_statement,
        $.return_statement,
        $.exit_statement,
        $.continue_statement,
        $.null_statement,
        $.assignment_statement,
        $.pragma_statement,
        $.pipe_row_statement,
      ),
    ),

    from: $ => seq(
      $.keyword_from,
      optional($.keyword_only),
      comma_list($.relation, true),
      repeat(
        choice(
          $.join,
          $.cross_join,
          $.lateral_join,
          $.lateral_cross_join,
        ),
      ),
      optional($.where),
      optional($.connect_by_clause),
      optional($.group_by),
      optional($.having),
      optional($.window_clause),
      optional($.order_siblings_by),
      optional($.order_by),
      optional($.limit),
      optional($.offset_fetch_clause),
    ),

    // Override relation to add FLASHBACK AS OF clause
    relation: $ => prec.right(
      seq(
        choice(
          $.subquery,
          $.invocation,
          $.object_reference,
          wrapped_in_parenthesis($.values),
        ),
        optional($.flashback_clause),
        optional($.tablesample),
        optional(
          seq(
            $._alias,
            optional(alias($._column_list, $.list)),
          ),
        ),
      ),
    ),

    // Extend unary_expression to include Oracle PRIOR operator
    unary_expression: $ => choice(
      ...[
        [$.keyword_not, 'unary_not'],
        [$.bang, 'unary_not'],
        [$.keyword_any, 'unary_not'],
        [$.keyword_some, 'unary_not'],
        [$.keyword_all, 'unary_not'],
        [$.op_unary_other, 'unary_other'],
        [$.keyword_prior, 'unary_prior'],
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field('operator', operator),
          field('operand', $._expression)
        ))
      ),
    ),

    // Override _expression to add Oracle date/timestamp literal forms (DATE '...' / TIMESTAMP '...')
    _expression: $ => prec(1, choice(
      $.literal,
      alias($._qualified_field, $.field),
      $.parameter,
      $.list,
      $.case,
      $.window_function,
      $.subquery,
      $.cast,
      $.exists,
      $.invocation,
      $.binary_expression,
      $.subscript,
      $.unary_expression,
      $.array,
      $.interval,
      $.between_expression,
      $.parenthesized_expression,
      $.trim_expression,
      $.oracle_date_literal,
      $.oracle_timestamp_literal,
    )),

    // Oracle-specific keywords — token(prec(1,...)) needed so lexer prefers
    // these over base _identifier when both are valid in the same state.
    keyword_exceptions:     _ => token(prec(1, make_keyword("exceptions"))),
    keyword_connect:        _ => token(prec(1, make_keyword("connect"))),
    keyword_prior:          _ => token(prec(1, make_keyword("prior"))),
    keyword_nocycle:        _ => token(prec(1, make_keyword("nocycle"))),
    keyword_siblings:       _ => token(prec(1, make_keyword("siblings"))),
    keyword_forall:         _ => token(prec(1, make_keyword("forall"))),
    keyword_bulk:           _ => token(prec(1, make_keyword("bulk"))),
    keyword_collect:        _ => token(prec(1, make_keyword("collect"))),
    keyword_indices:        _ => token(prec(1, make_keyword("indices"))),
    keyword_rowtype:        _ => token(prec(1, make_keyword("rowtype"))),
    keyword_save:           _ => token(prec(1, make_keyword("save"))),
    keyword_target:         _ => token(prec(1, make_keyword("target"))),
    keyword_rownum:         _ => token(prec(1, make_keyword("rownum"))),
    keyword_dual:           _ => token(prec(1, make_keyword("dual"))),
    keyword_cursor:         _ => token(prec(1, make_keyword("cursor"))),
    keyword_open:           _ => token(prec(1, make_keyword("open"))),
    keyword_fetch:          _ => token(prec(1, make_keyword("fetch"))),
    keyword_close:          _ => token(prec(1, make_keyword("close"))),
    keyword_package:        _ => token(prec(1, make_keyword("package"))),
    keyword_body:           _ => token(prec(1, make_keyword("body"))),
    keyword_editionable:    _ => token(prec(1, make_keyword("editionable"))),
    keyword_noneditionable: _ => token(prec(1, make_keyword("noneditionable"))),
    keyword_authid:         _ => token(prec(1, make_keyword("authid"))),
    keyword_pragma:         _ => token(prec(1, make_keyword("pragma"))),
    keyword_reverse:        _ => token(prec(1, make_keyword("reverse"))),
    keyword_continue:       _ => token(prec(1, make_keyword("continue"))),
    keyword_elsif:          _ => token(prec(1, make_keyword("elsif"))),
    keyword_exit:           _ => token(prec(1, make_keyword("exit"))),
    keyword_loop:           _ => token(prec(1, make_keyword("loop"))),
    keyword_exception:      _ => token(prec(1, make_keyword("exception"))),
    keyword_while:          _ => token(prec(1, make_keyword("while"))),
    keyword_source:         _ => token(prec(1, make_keyword("source"))),
    keyword_declare:        _ => token(prec(1, make_keyword("declare"))),
    keyword_current_user:   _ => token(prec(1, make_keyword("current_user"))),

    keyword_pipe:           _ => token(prec(1, make_keyword("pipe"))),

    // Oracle DDL extension keywords
    keyword_scn:            _ => token(prec(1, make_keyword("scn"))),
    keyword_synonym:        _ => token(prec(1, make_keyword("synonym"))),
    keyword_shared:         _ => token(prec(1, make_keyword("shared"))),
    keyword_identified:     _ => token(prec(1, make_keyword("identified"))),
    keyword_link:           _ => token(prec(1, make_keyword("link"))),

    // Oracle type keywords
    keyword_number:         _ => token(prec(1, make_keyword("number"))),
    keyword_varchar2:       _ => token(prec(1, make_keyword("varchar2"))),
    keyword_nvarchar2:      _ => token(prec(1, make_keyword("nvarchar2"))),
    keyword_clob:           _ => token(prec(1, make_keyword("clob"))),
    keyword_nclob:          _ => token(prec(1, make_keyword("nclob"))),
    keyword_blob:           _ => token(prec(1, make_keyword("blob"))),
    keyword_bfile:          _ => token(prec(1, make_keyword("bfile"))),
    keyword_raw:            _ => token(prec(1, make_keyword("raw"))),
    keyword_long:           _ => token(prec(1, make_keyword("long"))),
    keyword_rowid:          _ => token(prec(1, make_keyword("rowid"))),
    keyword_urowid:         _ => token(prec(1, make_keyword("urowid"))),
    keyword_binary_float:   _ => token(prec(1, make_keyword("binary_float"))),
    keyword_binary_double:  _ => token(prec(1, make_keyword("binary_double"))),
    keyword_byte:           _ => token(prec(1, make_keyword("byte"))),
    keyword_year:           _ => token(prec(1, make_keyword("year"))),
    keyword_month:          _ => token(prec(1, make_keyword("month"))),
    keyword_day:            _ => token(prec(1, make_keyword("day"))),
    keyword_second:         _ => token(prec(1, make_keyword("second"))),

    // Oracle partition keywords
    keyword_list:           _ => token(prec(1, make_keyword("list"))),
    keyword_partitions:     _ => token(prec(1, make_keyword("partitions"))),
    keyword_subpartition:   _ => token(prec(1, make_keyword("subpartition"))),
    keyword_subpartitions:  _ => token(prec(1, make_keyword("subpartitions"))),
    keyword_less:           _ => token(prec(1, make_keyword("less"))),
    keyword_than:           _ => token(prec(1, make_keyword("than"))),
    keyword_split:          _ => token(prec(1, make_keyword("split"))),
    keyword_exchange:       _ => token(prec(1, make_keyword("exchange"))),
    keyword_at:             _ => token(prec(1, make_keyword("at"))),

    // Override create_table to add optional partition clause
    create_table: $ => prec.left(seq(
      $.keyword_create,
      optional($._or_replace),
      optional($._temporary),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      seq(
        optional($.column_definitions),
        optional(seq($.keyword_as, $.create_query)),
      ),
      optional($.oracle_partition_clause),
    )),

    // Override INSERT to add optional RETURNING INTO
    insert: $ => seq(
      $.keyword_insert,
      optional($.keyword_into),
      $.object_reference,
      optional(seq($.keyword_as, field('alias', $.identifier))),
      choice(
        $._insert_values,
        $._set_values,
      ),
      optional($.returning_into_clause),
    ),

    // Override UPDATE to add optional WHERE and RETURNING INTO
    update: $ => seq(
      $.keyword_update,
      optional($.keyword_only),
      $.relation,
      $._set_values,
      optional($.where),
      optional($.returning_into_clause),
    ),

    // Override _delete_statement to add optional RETURNING INTO
    _delete_statement: $ => seq(
      $.delete,
      alias($._oracle_delete_from, $.from),
    ),

    _oracle_delete_from: $ => seq(
      $.keyword_from,
      optional($.keyword_only),
      $.object_reference,
      optional($.where),
      optional($.returning_into_clause),
    ),

    // Extend _alter_specifications to include Oracle partition operations
    _alter_specifications: $ => choice(
      $.add_column,
      $.add_constraint,
      $.drop_constraint,
      $.alter_column,
      $.modify_column,
      $.change_column,
      $.drop_column,
      $.rename_object,
      $.rename_column,
      $.set_schema,
      $.change_ownership,
      $.oracle_alter_partition,
    ),

    ...oracle_hierarchical_rules,
    ...oracle_plsql_rules,
    ...oracle_bulk_rules,
    ...oracle_merge_rules,
    ...oracle_cursor_rules,
    ...oracle_package_rules,
    ...oracle_procedural_rules,
    ...oracle_type_rules,
    ...oracle_hint_rules,
    ...oracle_partition_rules,
    ...oracle_ddl_ext_rules,

  },
});
