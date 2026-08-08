import { comma_list, paren_list } from '../../grammar/helpers.js';

// Athena DDL that had no rule at all, from the DDL statement list in
// https://docs.aws.amazon.com/athena/latest/ug/ddl-reference.html
export default {

  // SHOW VIEWS [IN db] [LIKE '…']      SHOW DATABASES [LIKE '…']
  // SHOW CREATE {TABLE | VIEW} name    SHOW PARTITIONS table
  // SHOW TBLPROPERTIES table [('key')]
  //
  // Kept as its own statement rather than overriding Trino's show_statement:
  // an override replaces the parent rule wholesale, which would drop every
  // SHOW form Trino defines (CATALOGS, SCHEMAS, GRANTS, BRANCHES, …).
  athena_show_statement: $ => prec.right(seq(
    $.keyword_show,
    choice(
      seq($.keyword_views, optional(seq($.keyword_in, $.object_reference))),
      $.keyword_databases,
      seq(
        $.keyword_create,
        choice($.keyword_table, $.keyword_view),
        field('name', $.object_reference),
      ),
      seq($.keyword_partitions, field('table', $.object_reference)),
      seq(
        $.keyword_tblproperties,
        field('table', $.object_reference),
        optional(paren_list(alias($._literal_string, $.literal), true)),
      ),
    ),
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  )),

  // ALTER {DATABASE | SCHEMA} db SET DBPROPERTIES ('k' = 'v' [, …])
  alter_database_properties: $ => seq(
    $.keyword_alter,
    choice($.keyword_database, $.keyword_schema),
    field('name', $.object_reference),
    $.keyword_set,
    $.keyword_dbproperties,
    paren_list($.property_pair, true),
  ),

  property_pair: $ => seq(
    field('key', alias($._literal_string, $.literal)),
    '=',
    field('value', alias($._literal_string, $.literal)),
  ),

  // ALTER VIEW v DIALECT { ATHENA | HIVE | SPARK } AS query
  alter_view_dialect: $ => seq(
    $.keyword_alter,
    $.keyword_view,
    field('name', $.object_reference),
    $.keyword_dialect,
    field('dialect', $.identifier),
    $.keyword_as,
    $.create_query,
  ),

  // DESCRIBE VIEW v — Trino's describe_statement has no VIEW keyword slot.
  describe_view_statement: $ => seq(
    choice($.keyword_describe, $.keyword_desc),
    $.keyword_view,
    field('name', $.object_reference),
  ),

};
