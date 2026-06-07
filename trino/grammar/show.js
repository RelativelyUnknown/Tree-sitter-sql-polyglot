export default {

  // SHOW CATALOGS [LIKE 'pattern']
  show_catalogs: $ => seq(
    $.keyword_show,
    $.keyword_catalogs,
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  ),

  // SHOW SCHEMAS [FROM catalog] [LIKE 'pattern']
  show_schemas: $ => seq(
    $.keyword_show,
    $.keyword_schemas,
    optional(seq($.keyword_from, $.object_reference)),
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  ),

  // SHOW TABLES [FROM schema] [LIKE 'pattern']
  show_tables: $ => seq(
    $.keyword_show,
    $.keyword_tables,
    optional(seq($.keyword_from, $.object_reference)),
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  ),

  // SHOW COLUMNS FROM table
  show_columns: $ => seq(
    $.keyword_show,
    $.keyword_columns,
    $.keyword_from,
    $.object_reference,
  ),

  // SHOW FUNCTIONS [LIKE 'pattern']
  show_functions: $ => seq(
    $.keyword_show,
    $.keyword_functions,
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  ),

  // SHOW SESSION [LIKE 'pattern']
  show_session: $ => seq(
    $.keyword_show,
    $.keyword_session,
    optional(seq($.keyword_like, alias($._literal_string, $.literal))),
  ),

};
