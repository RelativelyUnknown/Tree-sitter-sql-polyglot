export default {

  // SELECT ... INTO OUTFILE '/path' [CHARACTER SET cs] [fields_clause] [lines_clause] FROM ...
  into_outfile_clause: $ => seq(
    $.keyword_into,
    $.keyword_outfile,
    field('file', alias($._literal_string, $.literal)),
    optional(seq($.keyword_character, $.keyword_set, field('charset', $.identifier))),
    optional($._outfile_fields_clause),
    optional($._outfile_lines_clause),
  ),

  // SELECT ... INTO DUMPFILE '/path' FROM ...
  into_dumpfile_clause: $ => seq(
    $.keyword_into,
    $.keyword_dumpfile,
    field('file', alias($._literal_string, $.literal)),
  ),

  // FIELDS|COLUMNS TERMINATED BY x [OPTIONALLY ENCLOSED BY x] [ESCAPED BY x]
  _outfile_fields_clause: $ => seq(
    choice($.keyword_fields, $.keyword_columns),
    repeat1(choice(
      seq($.keyword_terminated, $.keyword_by, alias($._literal_string, $.literal)),
      seq(optional($.keyword_optionally), $.keyword_enclosed, $.keyword_by, alias($._literal_string, $.literal)),
      seq($.keyword_escaped, $.keyword_by, alias($._literal_string, $.literal)),
    )),
  ),

  // LINES [STARTING BY x] [TERMINATED BY x]
  _outfile_lines_clause: $ => seq(
    $.keyword_lines,
    repeat1(choice(
      seq($.keyword_starting, $.keyword_by, alias($._literal_string, $.literal)),
      seq($.keyword_terminated, $.keyword_by, alias($._literal_string, $.literal)),
    )),
  ),

};
