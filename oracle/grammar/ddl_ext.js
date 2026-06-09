export default {

  // AS OF SCN expr | AS OF TIMESTAMP expr
  flashback_clause: $ => seq(
    $.keyword_as,
    $.keyword_of,
    choice(
      seq($.keyword_scn, $._expression),
      seq($.keyword_timestamp, $._expression),
    ),
  ),

  // CREATE [OR REPLACE] [PUBLIC] SYNONYM name FOR ref [@dblink]
  create_synonym_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($.keyword_public),
    $.keyword_synonym,
    $.object_reference,
    $.keyword_for,
    $.object_reference,
    optional(seq('@', $.identifier)),
  ),

  // DROP [PUBLIC] SYNONYM name [FORCE]
  drop_synonym_statement: $ => seq(
    $.keyword_drop,
    optional($.keyword_public),
    $.keyword_synonym,
    $.object_reference,
  ),

  // CREATE [SHARED] [PUBLIC] DATABASE LINK name
  //   [CONNECT TO user IDENTIFIED BY password]
  //   [USING 'service']
  create_database_link_statement: $ => seq(
    $.keyword_create,
    optional($.keyword_shared),
    optional($.keyword_public),
    $.keyword_database,
    $.keyword_link,
    $.object_reference,
    optional(seq(
      $.keyword_connect,
      $.keyword_to,
      $.identifier,
      $.keyword_identified,
      $.keyword_by,
      $._expression,
    )),
    optional(seq($.keyword_using, alias($._literal_string, $.literal))),
  ),

};
