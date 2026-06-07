export default {

  // Delta Lake time travel:
  //   table VERSION AS OF n
  //   table TIMESTAMP AS OF expr
  delta_time_travel: $ => seq(
    choice(
      seq($.keyword_version, $.keyword_as, $.keyword_of, $._expression),
      seq($.keyword_timestamp, $.keyword_as, $.keyword_of, $._expression),
    ),
  ),

};
