export default {

  // ORDER SIBLINGS BY; used instead of ORDER BY in hierarchical queries
  order_siblings_by: $ => seq(
    $.keyword_order,
    $.keyword_siblings,
    $.keyword_by,
    $.order_target,
    repeat(seq(',', $.order_target)),
  ),

};
