import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// Table references, joins and flashback in the FROM clause (Oracle SQL Language Reference 26ai,
// SELECT: table_reference, query_table_expression, joined_table, flashback_query_clause).

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_apply:       _ => kw('apply'),
  keyword_block:       _ => kw('block'),
  keyword_seed:        _ => kw('seed'),
  keyword_versions:    _ => kw('versions'),

  // Database link: schema.table@link, with a dotted link name (link.example.com).
  object_reference: $ => seq(
    choice(
      seq(
        field('database', $.identifier),
        '.',
        field('schema', $.identifier),
        '.',
        field('name', $.identifier),
      ),
      seq(
        field('schema', $.identifier),
        '.',
        field('name', $.identifier),
      ),
      field('name', $.identifier),
    ),
    optional(seq('@', field('dblink', $.dblink_name))),
  ),

  dblink_name: $ => seq($.identifier, repeat(seq('.', $.identifier))),

  // table, view, subquery, collection or inline relation, with the clauses that qualify it
  relation: $ => prec.right(
    seq(
      choice(
        $.restricted_subquery,
        $.subquery,
        $.invocation,
        $.json_table,
        seq($.object_reference, $.nested_columns_clause),
        $.xmltable,
        $.object_reference,
        wrapped_in_parenthesis($.values),
        seq($.keyword_only, wrapped_in_parenthesis($.object_reference)),
        $.table_collection,
        // (t JOIN u ON …)
        wrapped_in_parenthesis(seq($.relation, repeat1($.join))),
      ),
      optional($.partition_extension),
      optional($.flashback_clause),
      optional(choice($.tablesample, $.sample_clause)),
      optional(choice($.pivot_clause, $.unpivot_clause)),
      optional($.match_recognize_clause),
      optional(
        seq(
          $._alias,
          optional(alias($._column_list, $.list)),
        ),
      ),
      optional($.partition_by),
    ),
  ),

  // , LATERAL (subquery) [alias] as a comma-separated FROM item
  lateral_relation: $ => seq($.keyword_lateral, $.subquery, optional($._alias)),

  // (SELECT …) WITH READ ONLY | WITH CHECK OPTION [CONSTRAINT c]
  restricted_subquery: $ => seq(
    '(',
    $._dml_read,
    $.keyword_with,
    choice(
      seq($.keyword_read, $.keyword_only),
      seq($.keyword_check, $.keyword_option),
    ),
    optional(seq($.keyword_constraint, $.identifier)),
    ')',
  ),

  // TABLE (collection_expression) [(+)]
  table_collection: $ => seq(
    $.keyword_table,
    wrapped_in_parenthesis(choice($._dml_read, $._expression)),
    optional(seq('(', '+', ')')),
  ),

  // PARTITION (p) | PARTITION FOR (v, …) | SUBPARTITION (sp) | SUBPARTITION FOR (v, …)
  partition_extension: $ => seq(
    choice($.keyword_partition, $.keyword_subpartition),
    choice(
      wrapped_in_parenthesis($.identifier),
      seq($.keyword_for, paren_list($._expression, true)),
    ),
  ),

  // SAMPLE [BLOCK] (percent) [SEED (n)]
  sample_clause: $ => seq(
    $.keyword_sample,
    optional($.keyword_block),
    '(',
    alias($._decimal_or_integer, $.literal),
    ')',
    optional(seq($.keyword_seed, wrapped_in_parenthesis(alias($._natural_number, $.literal)))),
  ),

  _decimal_or_integer: $ => choice($._decimal_number, $._integer),

  // Flashback query: AS OF {SCN | TIMESTAMP | PERIOD FOR p} expr, VERSIONS BETWEEN … AND …
  flashback_clause: $ => choice(
    seq(
      $.keyword_as,
      $.keyword_of,
      choice(
        seq($.keyword_scn, $._expression),
        seq($.keyword_timestamp, $._expression),
        seq($.keyword_period, $.keyword_for, $.identifier, $._expression),
      ),
    ),
    prec.left('between', seq(
      $.keyword_versions, $.keyword_between,
      optional(choice($.keyword_scn, $.keyword_timestamp)),
      field('low', choice($.keyword_minvalue, $._expression)),
      $.keyword_and,
      field('high', choice($.keyword_maxvalue, $._expression)),
    )),
    prec.left('between', seq(
      $.keyword_versions, $.keyword_period, $.keyword_for, $.identifier,
      $.keyword_between,
      field('low', $._expression),
      $.keyword_and,
      field('high', $._expression),
    )),
  ),

  // CROSS APPLY / OUTER APPLY (subquery or collection) [alias]
  apply_join: $ => seq(
    choice($.keyword_cross, $.keyword_outer),
    $.keyword_apply,
    choice($.subquery, $.table_collection, $.invocation),
    optional($._alias),
  ),

  // JOIN TO ONE (t [, u …]) | JOIN TO ONE (LEFT OUTER JOIN t ON … …)
  join_to_one: $ => seq(
    $.keyword_join, $.keyword_to, $.keyword_one,
    '(',
    choice(
      comma_list($.relation, true),
      repeat1($.join),
    ),
    ')',
  ),

  // Oracle outer join operator: t.id = u.id (+)
  outer_join_column: $ => prec.left(seq(
    alias($._qualified_field, $.field),
    '(', '+', ')',
  )),

};
