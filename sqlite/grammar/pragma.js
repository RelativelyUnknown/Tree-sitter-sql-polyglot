export default {

  pragma_statement: $ => seq(
    $.keyword_pragma,
    field('name', $.object_reference),
    optional(choice(
      seq('=', field('value', choice($._expression, $.keyword_on))),
      seq('(', field('value', choice($._expression, $.keyword_on)), ')'),
    )),
  ),

};
