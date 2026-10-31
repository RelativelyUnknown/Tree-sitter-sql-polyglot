import { comma_list, paren_list } from '../../grammar/helpers.js';

export default {

  // FOR rec IN cursor_or_select LOOP stmts END LOOP [label];
  cursor_for_loop: $ => seq(
    $.keyword_for,
    field('record', $.identifier),
    $.keyword_in,
    choice(
      field('cursor', $.identifier),
      seq('(', $._dml_read, ')'),
    ),
    $.keyword_loop,
    repeat(seq($.statement, ';')),
    $.keyword_end,
    $.keyword_loop,
    optional(field('label', $.identifier)),
  ),

};
