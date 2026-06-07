import { comma_list } from '../../grammar/helpers.js';

export default {

  // SHOW [TERSE] <object_type>
  //   [LIKE 'pattern']
  //   [IN { ACCOUNT | DATABASE [name] | SCHEMA [name] }]
  //   [STARTS WITH 'prefix']
  //   [LIMIT n [FROM 'cursor']]
  show_statement: $ => seq(
    $.keyword_show,
    optional($.keyword_terse),
    choice(
      $.keyword_tables,
      $.keyword_views,
      $.keyword_schemas,
      $.keyword_databases,
      $.keyword_warehouses,
      $.keyword_stages,
      $.keyword_streams,
      $.keyword_tasks,
      $.keyword_procedures,
      $.keyword_functions,
      $.keyword_roles,
      $.keyword_users,
      $.keyword_columns,
      $.keyword_sequences,
      $.keyword_pipes,
      $.keyword_grants,
      $.keyword_objects,
      $.keyword_parameters,
      $.keyword_variables,
      $.keyword_integrations,
    ),
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
    optional(seq(
      $.keyword_in,
      choice(
        $.keyword_account,
        seq($.keyword_database, optional($.object_reference)),
        seq($.keyword_schema, optional($.object_reference)),
      ),
    )),
    optional(seq($.keyword_starts, $.keyword_with, alias($._literal_string, $.literal))),
    optional(seq($.keyword_limit, $._natural_number,
      optional(seq($.keyword_from, alias($._literal_string, $.literal))))),
  ),

};
