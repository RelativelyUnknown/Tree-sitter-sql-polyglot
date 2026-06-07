import { comma_list, wrapped_in_parenthesis, optional_parenthesis } from '../../grammar/helpers.js';

export default {

  // QUALIFY expr
  qualify: $ => seq(
    $.keyword_qualify,
    $._expression,
  ),

  // * EXCLUDE (col1, col2)
  all_fields_exclude: $ => seq(
    optional(seq($.object_reference, '.')),
    '*',
    $.keyword_exclude,
    choice(
      field('col', $.identifier),
      seq('(', comma_list(field('col', $.identifier), true), ')'),
    ),
  ),

  // * REPLACE (expr AS col, ...)
  all_fields_replace: $ => seq(
    optional(seq($.object_reference, '.')),
    '*',
    $.keyword_replace,
    '(',
    comma_list(
      seq(field('value', $._expression), $.keyword_as, field('col', $.identifier)),
      true,
    ),
    ')',
  ),

  // * RENAME (col AS new_col, ...)
  all_fields_rename: $ => seq(
    optional(seq($.object_reference, '.')),
    '*',
    $.keyword_rename,
    '(',
    comma_list(
      seq(field('old_col', $.identifier), $.keyword_as, field('new_col', $.identifier)),
      true,
    ),
    ')',
  ),

  // Override term to add * EXCLUDE / * REPLACE / * RENAME variants
  term: $ => seq(
    field(
      'value',
      choice(
        $.all_fields_exclude,
        $.all_fields_replace,
        $.all_fields_rename,
        $.all_fields,
        $._expression,
      ),
    ),
    optional($._alias),
  ),

  // Override from to add QUALIFY
  from: $ => seq(
    $.keyword_from,
    optional($.keyword_only),
    comma_list($.relation, true),
    repeat(
      choice(
        $.join,
        $.cross_join,
        $.lateral_join,
        $.lateral_cross_join,
        $.asof_join,
        $.positional_join,
      ),
    ),
    optional($.where),
    optional($.group_by),
    optional($.having),
    optional($.qualify),
    optional($.window_clause),
    optional($.order_by),
    optional($.limit),
    optional($.offset_fetch_clause),
  ),

  // FROM-first syntax: FROM t [WHERE ...] [SELECT ...]
  from_first_select: $ => seq(
    $.keyword_from,
    optional($.keyword_only),
    comma_list($.relation, true),
    repeat(
      choice(
        $.join,
        $.cross_join,
        $.lateral_join,
        $.lateral_cross_join,
        $.asof_join,
        $.positional_join,
      ),
    ),
    optional($.where),
    optional($.group_by),
    optional($.having),
    optional($.qualify),
    optional($.window_clause),
    optional($.order_by),
    optional($.limit),
    optional(seq(
      $.keyword_select,
      optional($.keyword_distinct),
      $.select_expression,
    )),
  ),

  // ASOF JOIN relation ON predicate
  asof_join: $ => seq(
    $.keyword_asof,
    optional(
      choice(
        $.keyword_left,
        seq($.keyword_left, $.keyword_outer),
      ),
    ),
    $.keyword_join,
    $.relation,
    choice(
      seq($.keyword_on, field('predicate', $._expression)),
      seq($.keyword_using, wrapped_in_parenthesis(comma_list($.identifier, true))),
    ),
  ),

  // POSITIONAL JOIN relation
  positional_join: $ => seq(
    $.keyword_positional,
    $.keyword_join,
    $.relation,
  ),

  // Override relation to allow bare string literal as a FROM source
  // e.g. SELECT * FROM '*.parquet' or SELECT * FROM ['a.parquet','b.parquet']
  relation: $ => prec.right(
    seq(
      choice(
        $.subquery,
        $.invocation,
        $.object_reference,
        alias($._literal_string, $.literal),
      ),
      optional($.tablesample),
      optional(
        seq(
          $._alias,
          optional(alias($._column_list, $.list)),
        ),
      ),
    ),
  ),

  // Override group_by to add GROUP BY ALL
  group_by: $ => prec.left(seq(
    $.keyword_group,
    $.keyword_by,
    choice(
      $.keyword_all,
      comma_list(choice(
        $._expression,
        $.rollup_clause,
        $.cube_clause,
        $.grouping_sets_clause,
      ), true),
    ),
  )),

  // Override order_by to add ORDER BY ALL
  order_by: $ => prec.right(seq(
    $.keyword_order,
    $.keyword_by,
    choice(
      $.keyword_all,
      comma_list($.order_target, true),
    ),
  )),

};
