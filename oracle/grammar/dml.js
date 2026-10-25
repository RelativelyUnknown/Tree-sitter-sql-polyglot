import { comma_list, paren_list, optional_parenthesis, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// INSERT / UPDATE / DELETE / MERGE (Oracle SQL Language Reference 26ai), including multitable
// INSERT, error logging, RETURNING … INTO, row-locking waits and the 26ai FROM / USING / SET forms.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_errors:       _ => kw('errors'),
  keyword_forever:      _ => kw('forever'),
  keyword_name:         _ => kw('name'),
  keyword_position:     _ => kw('position'),
  keyword_seconds:      _ => kw('seconds'),
  keyword_milliseconds: _ => kw('milliseconds'),

  // Bind variables: :name, :1, ? and $1
  parameter: _ => token(choice('?', /\$[0-9]+/, /:[A-Za-z_][A-Za-z0-9_$#]*/, /:[0-9]+/)),

  // ── Targets and shared clauses ─────────────────────────────────────────

  // table, view, (subquery [WITH CHECK OPTION]), TABLE(collection), ONLY (view), with partition
  // extension and alias
  dml_target: $ => seq(
    choice(
      $.object_reference,
      $.restricted_subquery,
      $.subquery,
      $.table_collection,
      seq($.keyword_only, wrapped_in_parenthesis($.object_reference)),
    ),
    optional($.partition_extension),
    optional($._alias),
  ),

  // FROM u [JOIN …] | USING u: the 26ai multi-table forms of UPDATE and DELETE
  _dml_extra_from: $ => seq(
    choice($.keyword_from, $.keyword_using),
    comma_list($.relation, true),
    repeat(choice($.join, $.cross_join, $.lateral_join, $.lateral_cross_join)),
  ),

  // NOWAIT | WAIT n [SECONDS]
  _dml_wait: $ => choice(
    $.keyword_nowait,
    seq($.keyword_wait, alias($._natural_number, $.literal), optional($.keyword_seconds)),
  ),

  // LOG ERRORS [INTO [schema.]table] [('tag')] [REJECT LIMIT {n | UNLIMITED}]
  log_errors_clause: $ => seq(
    $.keyword_log, $.keyword_errors,
    optional(seq($.keyword_into, $.object_reference)),
    optional(wrapped_in_parenthesis($._expression)),
    optional(seq($.keyword_reject, $.keyword_limit, choice(alias($._natural_number, $.literal), $.keyword_unlimited))),
  ),

  // {RETURN | RETURNING} [OLD | NEW] expr, … [BULK COLLECT] INTO target, …
  returning_into_clause: $ => seq(
    choice($.keyword_returning, $.keyword_return),
    comma_list(seq(optional(choice($.keyword_old, $.keyword_new)), $._expression), true),
    optional(seq($.keyword_bulk, $.keyword_collect)),
    $.keyword_into,
    comma_list(choice($.identifier, $.parameter), true),
  ),

  _dml_tail: $ => choice(
    $.returning_into_clause,
    $.log_errors_clause,
    $._dml_wait,
  ),

  // ── Assignments ────────────────────────────────────────────────────────

  assignment_list: $ => comma_list($.assignment, true),

  assignment: $ => choice(
    seq(
      field('left', alias($._qualified_field, $.field)),
      '=',
      field('right', choice($._expression, $.keyword_default)),
    ),
    // SET (c, d) = (1, DEFAULT) | SET (c, d) = (subquery)
    seq(
      field('left', paren_list(alias($._qualified_field, $.field), true)),
      '=',
      field('right', choice(
        $.subquery,
        alias(paren_list(choice($._expression, $.keyword_default), true), $.list),
      )),
    ),
    // SET VALUE(p) = expr (object tables)
    seq(
      field('left', seq($.keyword_value, wrapped_in_parenthesis($.identifier))),
      '=',
      field('right', $._expression),
    ),
  ),

  // SET c = 1, d = 2 | SET (c = 1, d = 2), (c = 3, d = 4)
  _set_values: $ => seq(
    $.keyword_set,
    choice(
      comma_list($.assignment, true),
      comma_list(wrapped_in_parenthesis(comma_list($.assignment, true)), true),
    ),
  ),

  // ── INSERT ─────────────────────────────────────────────────────────────

  _insert_columns: $ => alias(
    paren_list(
      choice(
        alias($._column, $.column),
        alias(seq($.identifier, repeat1(seq('.', $.identifier))), $.field),
      ),
      true,
    ),
    $.list,
  ),

  _insert_values: $ => seq(
    optional($._insert_columns),
    choice(
      seq(
        $.keyword_values,
        comma_list(alias(paren_list(choice($._expression, $.keyword_default), true), $.list), true),
      ),
      // INSERT … VALUES record | VALUES coll(i) (PL/SQL records)
      seq($.keyword_values, choice($.invocation, $.object_reference)),
      seq($.keyword_by, choice($.keyword_name, $.keyword_position), $._dml_read),
      $._dml_read,
    ),
  ),

  insert: $ => seq(
    $.keyword_insert,
    optional($.keyword_into),
    alias($.dml_target, $.relation),
    choice($._insert_values, $._set_values),
    repeat($._dml_tail),
  ),

  _insert_statement: $ => choice($.insert, $.multi_table_insert),

  // INSERT {ALL | FIRST} INTO … | INSERT [ALL | FIRST] WHEN cond THEN INTO … [ELSE INTO …] subquery
  multi_table_insert: $ => seq(
    $.keyword_insert,
    choice(
      seq(choice($.keyword_all, $.keyword_first), repeat1($.insert_into_clause)),
      seq(
        optional(choice($.keyword_all, $.keyword_first)),
        repeat1(seq($.keyword_when, field('condition', $._expression), $.keyword_then, repeat1($.insert_into_clause))),
        optional(seq($.keyword_else, repeat1($.insert_into_clause))),
      ),
    ),
    $._dml_read,
  ),

  insert_into_clause: $ => seq(
    $.keyword_into,
    alias($.dml_target, $.relation),
    optional($._insert_columns),
    optional(choice(
      seq($.keyword_values, alias(paren_list(choice($._expression, $.keyword_default), true), $.list)),
      $._set_values,
    )),
    optional($.log_errors_clause),
  ),

  // ── UPDATE ─────────────────────────────────────────────────────────────

  update: $ => seq(
    $.keyword_update,
    alias($.dml_target, $.relation),
    $._set_values,
    optional($._dml_extra_from),
    optional($.where),
    optional($.order_by),
    repeat($._dml_tail),
  ),

  // ── DELETE ─────────────────────────────────────────────────────────────

  _delete_statement: $ => seq(
    $.delete,
    choice(
      alias($._oracle_delete_from, $.from),
      alias($._oracle_delete_target, $.from),
    ),
  ),

  _oracle_delete_from: $ => seq(
    $.keyword_from,
    alias($.dml_target, $.relation),
    optional($._dml_extra_from),
    optional($.where),
    optional($.order_by),
    repeat($._dml_tail),
  ),

  // DELETE t WHERE …: FROM is optional
  _oracle_delete_target: $ => seq(
    alias($.dml_target, $.relation),
    optional($._dml_extra_from),
    optional($.where),
    optional($.order_by),
    repeat($._dml_tail),
  ),

  // ── MERGE ──────────────────────────────────────────────────────────────

  _merge_statement: $ => seq(
    $.keyword_merge,
    optional($.keyword_into),
    alias($.dml_target, $.relation),
    optional(seq($.keyword_using, $.relation)),
    optional(seq(
      $.keyword_on,
      optional_parenthesis(field('predicate', $._expression)),
    )),
    repeat1($.when_clause),
    repeat($._dml_tail),
  ),

  when_clause: $ => prec.left(seq(
    $.keyword_when,
    optional($.keyword_not),
    $.keyword_matched,
    optional(
      seq(
        $.keyword_by,
        choice($.keyword_target, $.keyword_source),
      ),
    ),
    optional(
      seq(
        $.keyword_and,
        optional_parenthesis(field('predicate', $._expression)),
      ),
    ),
    $.keyword_then,
    choice(
      $.keyword_delete,
      seq(
        $.keyword_update,
        $._set_values,
        optional($.where),
        optional(seq($.keyword_delete, $.keyword_where, field('delete_condition', $._expression))),
      ),
      // INSERT [(cols)] VALUES (…) [WHERE cond]
      seq(
        $.keyword_insert,
        optional($._insert_columns),
        $.keyword_values,
        alias(paren_list(choice($._expression, $.keyword_default), true), $.list),
        optional($.where),
      ),
      // INSERT [(cols)] subquery | INSERT BY NAME | POSITION subquery
      seq(
        $.keyword_insert,
        optional($._insert_columns),
        choice(
          seq($.keyword_by, choice($.keyword_name, $.keyword_position), $._dml_read),
          $._dml_read,
        ),
      ),
      seq(
        $.keyword_insert,
        $._set_values,
        optional($.where),
      ),
    ),
  )),

};
