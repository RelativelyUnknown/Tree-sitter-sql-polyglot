import { comma_list, paren_list } from '../../grammar/helpers.js';

// DROP / UNDROP / DESCRIBE / SHOW share one object vocabulary in Snowflake. The singular names
// come from the DROP / DESCRIBE pages, the plural names from the SHOW pages:
// https://docs.snowflake.com/en/sql-reference/sql/drop (and the sibling pages)
const SINGULAR = [
  'alert', 'api integration', 'application', 'application package', 'application role', 'catalog integration',
  'compute pool', 'connection', 'cortex search service', 'database', 'dbt project', 'dcm project',
  'dynamic table', 'event table', 'external table', 'external volume', 'file format', 'hybrid table',
  'iceberg table', 'integration', 'managed account', 'masking policy', 'mcp server', 'model', 'network policy',
  'network rule', 'notebook', 'notification integration', 'password policy', 'pipe', 'resource monitor',
  'row access policy', 'schema', 'security integration', 'semantic view', 'session policy', 'share', 'snapshot',
  'storage integration', 'stage', 'role', 'database role', 'stream', 'streamlit', 'tag', 'task', 'user', 'warehouse', 'account',
];

const PLURAL = [
  'alerts', 'applications', 'catalog integrations', 'columns', 'compute pools', 'connections',
  'cortex search services', 'databases', 'dbt projects', 'dcm projects', 'dynamic tables', 'event tables',
  'external functions', 'external tables', 'external volumes', 'file formats', 'functions', 'global accounts',
  'hybrid tables', 'iceberg tables', 'integrations', 'materialized views', 'masking policies', 'mcp servers',
  'network policies', 'network rules', 'notification integrations', 'objects', 'parameters', 'password policies',
  'pipes', 'primary keys', 'procedures', 'regions', 'replication accounts', 'replication databases',
  'resource monitors', 'roles', 'row access policies', 'schemas', 'sequences', 'session policies', 'shares',
  'stages', 'streamlits', 'streams', 'tables', 'tags', 'tasks', 'transactions', 'locks', 'user functions',
  'users', 'variables', 'views', 'warehouses', 'workspaces', 'imported keys', 'unique keys',
];

const words = ($, kinds) => kinds.map((k) => seq(...k.split(' ').map((w) => $[`keyword_${w.replace(/ /g, '_')}`])));

export default {

  _snowflake_object_kind: $ => choice(...words($, SINGULAR)),

  _snowflake_object_kind_plural: $ => choice(...words($, PLURAL)),

  // name or name(argtypes) for functions and procedures
  _snowflake_object_name: $ => seq($.object_reference, optional(paren_list(choice($._type, seq($.keyword_table, paren_list($._type, false))), false))),

  // DROP <object> [IF EXISTS] name [(argtypes)] [CASCADE | RESTRICT]
  drop_object: $ => seq(
    $.keyword_drop,
    choice($._snowflake_object_kind, $.keyword_function, $.keyword_procedure, seq($.keyword_data, $.keyword_metric, $.keyword_function)),
    optional($._if_exists),
    $._snowflake_object_name,
    optional($._drop_behavior),
  ),

  // UNDROP <object> name | IDENTIFIER(<id>)
  undrop_statement: $ => seq(
    $.keyword_undrop,
    choice($._snowflake_object_kind, $.keyword_table, $.keyword_type),
    choice($.object_reference, seq($.keyword_identifier, '(', $._expression, ')')),
  ),

  // DESCRIBE | DESC <object> name [TYPE = COLUMNS | STAGE]
  describe_statement: $ => seq(
    choice($.keyword_describe, $.keyword_desc),
    choice(
      seq($._snowflake_object_kind, $._snowflake_object_name),
      seq(choice($.keyword_table, $.keyword_view, $._materialized_view_kind, $.keyword_sequence, $.keyword_function, $.keyword_procedure), $._snowflake_object_name),
      seq($.keyword_result, $._expression),
    ),
    optional(seq($.keyword_type, '=', choice($.keyword_columns, $.keyword_stage))),
  ),

  _materialized_view_kind: $ => seq($.keyword_materialized, $.keyword_view),

  // SHOW [TERSE] <objects> [HISTORY] [LIKE '...'] [IN <scope>] [STARTS WITH '...'] [LIMIT n [FROM '...']]
  // SHOW [FUTURE] GRANTS ...
  show_statement: $ => seq(
    $.keyword_show,
    optional($.keyword_terse),
    choice(
      seq(
        optional($.keyword_future),
        $.keyword_grants,
        optional(choice(
          seq($.keyword_on, choice($.keyword_account, seq(choice($._snowflake_object_kind, $.keyword_table, $.keyword_view, $.keyword_function, $.keyword_procedure, $.keyword_sequence), $._snowflake_object_name))),
          seq($.keyword_to, choice($.keyword_role, $.keyword_user, $.keyword_share, $.keyword_application), $.object_reference),
          seq($.keyword_of, choice($.keyword_role, $.keyword_share), $.object_reference),
          seq($.keyword_in, choice($.keyword_database, $.keyword_schema, seq($.keyword_dcm, $.keyword_project)), $.object_reference),
        )),
        optional(seq($.keyword_limit, $._expression)),
      ),
      seq(
        choice($._snowflake_object_kind_plural, $.keyword_deployments),
        optional($.keyword_history),
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
        optional(seq($.keyword_in, $._show_scope)),
        optional(seq($.keyword_starts, $.keyword_with, alias($._literal_string, $.literal))),
        optional(seq(
          $.keyword_limit,
          field('limit', $._expression),
          optional(seq($.keyword_from, alias($._literal_string, $.literal))),
        )),
        optional(seq($.keyword_with, $.keyword_privileges, comma_list($.identifier, true))),
        optional(seq($.keyword_with, $.keyword_primary, $.object_reference)),
      ),
    ),
  ),

  _show_scope: $ => choice(
    $.keyword_account,
    $.keyword_session,
    seq($.keyword_database, optional($.object_reference)),
    seq($.keyword_schema, optional($.object_reference)),
    seq($.keyword_table, optional($.object_reference)),
    seq($.keyword_application, optional($.keyword_package), $.object_reference),
    seq($.keyword_dcm, $.keyword_project, $.object_reference),
    seq(choice($.keyword_view, $.keyword_task, $.keyword_warehouse, $.keyword_class), $.object_reference),
    $.object_reference,
  ),

};
