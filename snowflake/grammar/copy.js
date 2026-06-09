import { comma_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

export default {

  // COPY INTO <table> FROM @<stage> [copy_options]
  // COPY INTO <table> FROM (subquery) [copy_options]
  // COPY INTO @<stage> FROM <table|subquery> [copy_options]
  copy_into: $ => seq(
    $.keyword_copy,
    $.keyword_into,
    choice(
      seq(
        $.object_reference,
        $.keyword_from,
        choice(
          $.stage_ref,
          seq('(', $._dml_read, ')'),
        ),
        repeat($.copy_property),
      ),
      seq(
        $.stage_ref,
        $.keyword_from,
        choice(
          $.object_reference,
          seq('(', $._dml_read, ')'),
        ),
        repeat($.copy_property),
      ),
    ),
  ),

  // @stage_name  @~  @%table  @stage/path
  stage_ref: _ => /@[~%a-zA-Z0-9_./]*/,

  // KEY = value  (e.g. FILE_FORMAT = (TYPE = 'CSV'), PURGE = TRUE)
  copy_property: $ => seq(
    $.identifier,
    '=',
    choice(
      wrapped_in_parenthesis(comma_list($.copy_kv, true)),
      $.literal,
      $.identifier,
    ),
  ),

  copy_kv: $ => seq($.identifier, '=', choice($.literal, $.identifier)),

};
