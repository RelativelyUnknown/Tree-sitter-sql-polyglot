import { comma_list } from '../../grammar/helpers.js';

export default {

  // COPY INTO [<namespace>.]<table> [ ( <col> [, ...] ) ]
  //   [ FROM { <stage> | '<external location>' | ( <transform query> ) } ] [ <copy option> ... ]
  // COPY INTO { <stage> | '<external location>' } FROM { <table> | ( <query> ) } [ <copy option> ... ]
  copy_into: $ => seq(
    $.keyword_copy,
    $.keyword_into,
    choice(
      seq(
        $.object_reference,
        optional(seq('(', comma_list($.identifier), ')')),
        optional(seq($.keyword_from, $._copy_source)),
      ),
      seq(
        $._copy_location,
        $.keyword_from,
        choice($.object_reference, seq('(', $._dml_read, ')')),
      ),
    ),
    repeat($.copy_property),
  ),

  _copy_location: $ => choice($.stage_ref, $.literal),

  _copy_source: $ => choice(
    $.stage_ref,
    $.literal,
    seq('(', $._dml_read, ')'),
  ),

  // @stage_name  @~  @%table  @stage/path
  stage_ref: _ => /@[~%a-zA-Z0-9_./]*/,

  // KEY = value  (e.g. FILE_FORMAT = (TYPE = CSV), PURGE = TRUE, FILES = ('a', 'b'))
  copy_property: $ => seq(
    $.identifier,
    '=',
    $._copy_value,
  ),

  _copy_value: $ => choice(
    $.copy_list,
    $.literal,
    $.identifier,
  ),

  // ( KEY = value ... ) or ( 'a', 'b' ) or ()
  copy_list: $ => seq(
    '(',
    optional(choice(
      repeat1($.copy_kv),
      comma_list($._copy_value),
    )),
    ')',
  ),

  copy_kv: $ => seq($.identifier, '=', $._copy_value),

};
