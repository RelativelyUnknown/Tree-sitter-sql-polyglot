import { make_keyword } from '../../grammar/helpers.js';

export default {

  // SHOW [TERSE] <object_type>
  //   [LIKE '<pattern>']
  //   [IN { ACCOUNT | DATABASE [<name>] | SCHEMA [<name>] | TABLE [<name>] }]
  //   [STARTS WITH '<prefix>']
  //   [LIMIT <n> [FROM '<cursor>']]
  //
  // SHOW GRANTS [ON <type> <name> | TO { ROLE | USER } <name> | OF ROLE <name>]
  show_statement: $ => seq(
    $.keyword_show,
    optional($.keyword_terse),
    choice(
      seq(
        $.keyword_grants,
        optional(choice(
          seq($.keyword_on, $._show_object_type_singular, $.object_reference),
          seq($.keyword_to, choice($.keyword_role, $.keyword_user), $.object_reference),
          seq($.keyword_of, $.keyword_role, $.object_reference),
        )),
      ),
      seq(
        $._show_object_type,
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
        optional(seq(
          $.keyword_in,
          choice(
            $.keyword_account,
            seq($.keyword_database, optional($.object_reference)),
            seq($.keyword_schema, optional($.object_reference)),
            seq($.keyword_table, optional($.object_reference)),
          ),
        )),
        optional(seq($.keyword_starts, $.keyword_with, alias($._literal_string, $.literal))),
        optional(seq(
          $.keyword_limit,
          field('limit', $._expression),
          optional(seq($.keyword_from, alias($._literal_string, $.literal))),
        )),
      ),
    ),
  ),

  // Object types used after SHOW (plural forms)
  _show_object_type: $ => choice(
    $.keyword_tables,
    $.keyword_views,
    $.keyword_columns,
    $.keyword_schemas,
    $.keyword_databases,
    $.keyword_warehouses,
    $.keyword_stages,
    seq($.keyword_file, $.keyword_formats),
    $.keyword_streams,
    $.keyword_tasks,
    seq($.keyword_dynamic, $.keyword_tables),
    $.keyword_functions,
    $.keyword_procedures,
    $.keyword_roles,
    $.keyword_sequences,
    $.keyword_pipes,
    $.keyword_integrations,
    $.keyword_parameters,
    $.keyword_transactions,
    $.keyword_locks,
    $.keyword_users,
    seq($.keyword_masking, $.keyword_policies),
    seq($.keyword_row, $.keyword_access, $.keyword_policies),
  ),

  // Object types used after SHOW GRANTS ON (singular forms)
  _show_object_type_singular: $ => choice(
    $.keyword_table,
    $.keyword_view,
    $.keyword_schema,
    $.keyword_database,
    $.keyword_warehouse,
    $.keyword_stage,
    $.keyword_function,
    $.keyword_procedure,
    $.keyword_sequence,
    $.keyword_stream,
    $.keyword_task,
    seq($.keyword_dynamic, $.keyword_table),
    seq($.keyword_masking, $.keyword_policy),
    seq($.keyword_row, $.keyword_access, $.keyword_policy),
    $.keyword_pipe,
    $.keyword_integration,
  ),

  // DESCRIBE|DESC <object_type> <name>
  describe_statement: $ => seq(
    choice($.keyword_describe, $.keyword_desc),
    $._describe_object_type,
    $.object_reference,
  ),

  // Object types used after DESCRIBE/DESC
  _describe_object_type: $ => choice(
    $.keyword_table,
    $.keyword_view,
    $.keyword_stage,
    $.keyword_function,
    $.keyword_procedure,
    $.keyword_stream,
    $.keyword_task,
    seq($.keyword_dynamic, $.keyword_table),
    seq($.keyword_masking, $.keyword_policy),
    seq($.keyword_row, $.keyword_access, $.keyword_policy),
    $.keyword_sequence,
    $.keyword_pipe,
    $.keyword_integration,
  ),

};
