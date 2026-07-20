export default {

  _delete_statement: $ => seq(
    $.delete,
    alias($._delete_from, $.from),
  ),

  _delete_from: $ => seq(
    $.keyword_from,
    optional(
      $.keyword_only,
    ),
    $.object_reference,
    optional($.where),
    optional($.order_by),
    // Strict ANSI base: no LIMIT on DELETE (dialects re-add it in their override)
  ),

  delete: $ => seq(
    $.keyword_delete,
  ),

};
