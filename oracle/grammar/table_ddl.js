import { paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// CREATE TABLE column, constraint and table-property vocabulary
// (Oracle SQL Language Reference 26ai, CREATE TABLE).
//
// Column properties and constraint state are shared with ALTER TABLE ADD/MODIFY,
// which goes through the same `column_definition`.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_advanced:        _ => kw('advanced'),
  keyword_annotations:     _ => kw('annotations'),
  keyword_archival:        _ => kw('archival'),
  keyword_basic:           _ => kw('basic'),
  keyword_capacity:        _ => kw('capacity'),
  keyword_compress:        _ => kw('compress'),
  keyword_creation:        _ => kw('creation'),
  keyword_critical:        _ => kw('critical'),
  keyword_decrypt:         _ => kw('decrypt'),
  keyword_definition:      _ => kw('definition'),
  keyword_dml:             _ => kw('dml'),
  keyword_domain:          _ => kw('domain'),
  keyword_duplicated:      _ => kw('duplicated'),
  keyword_encrypt:         _ => kw('encrypt'),
  keyword_extended:        _ => kw('extended'),
  keyword_high:            _ => kw('high'),
  keyword_inmemory:        _ => kw('inmemory'),
  keyword_invisible:       _ => kw('invisible'),
  keyword_low:             _ => kw('low'),
  keyword_medium:          _ => kw('medium'),
  keyword_memcompress:     _ => kw('memcompress'),
  keyword_metadata:        _ => kw('metadata'),
  keyword_movement:        _ => kw('movement'),
  keyword_nocompress:      _ => kw('nocompress'),
  keyword_nomaxvalue:      _ => kw('nomaxvalue'),
  keyword_nominvalue:      _ => kw('nominvalue'),
  keyword_noorder:         _ => kw('noorder'),
  keyword_norely:          _ => kw('norely'),
  keyword_norowdependencies: _ => kw('norowdependencies'),
  keyword_novalidate:      _ => kw('novalidate'),
  keyword_oltp:            _ => kw('oltp'),
  keyword_preserve:        _ => kw('preserve'),
  keyword_priority:        _ => kw('priority'),
  keyword_private:         _ => kw('private'),
  keyword_rely:            _ => kw('rely'),
  keyword_result_cache:    _ => kw('result_cache'),
  keyword_rowdependencies: _ => kw('rowdependencies'),
  keyword_salt:            _ => kw('salt'),
  keyword_sharded:         _ => kw('sharded'),
  keyword_sharing:         _ => kw('sharing'),
  keyword_store:           _ => kw('store'),
  keyword_virtual:         _ => kw('virtual'),
  keyword_visible:         _ => kw('visible'),

  // ── Columns ────────────────────────────────────────────────────────────

  // A column needs a datatype, except where the type is inferred or already
  // known: virtual columns (`b AS (a * 2)`), `MODIFY (c NULL)`, `MODIFY (c
  // INVISIBLE)`. The typeless form therefore requires at least one property.
  column_definition: $ => prec.left(choice(
    seq(
      field('name', $._column),
      field('type', $._type),
      repeat($._column_constraint),
    ),
    seq(
      field('name', $._column),
      repeat1($._column_constraint),
    ),
  )),

  _constraint_name: $ => seq($.keyword_constraint, field('name', $.identifier)),

  _column_constraint: $ => prec.left(choice(
    seq(
      optional($._constraint_name),
      choice(
        $.keyword_null,
        $._not_null,
        $._oracle_references,
        $._primary_key,
        $.keyword_unique,
        $._check_constraint,
      ),
      repeat($._constraint_state),
    ),
    $._default_expression,
    $.direction,
    $._column_comment,
    // AS (expr) [VIRTUAL] | GENERATED ALWAYS AS (expr) [VIRTUAL]
    seq(
      optional(seq($.keyword_generated, $.keyword_always)),
      $.keyword_as,
      $._expression,
      optional($.keyword_virtual),
    ),
    // GENERATED {ALWAYS | BY DEFAULT [ON NULL]} AS IDENTITY [(options)]
    seq(
      $.keyword_generated,
      choice(
        $.keyword_always,
        seq($.keyword_by, $.keyword_default, optional(seq($.keyword_on, $.keyword_null))),
      ),
      $.keyword_as,
      $.keyword_identity,
      optional(wrapped_in_parenthesis(repeat1($._identity_option))),
    ),
    $.keyword_invisible,
    $.keyword_visible,
    seq($.keyword_collate, $.identifier),
    seq($.keyword_domain, $.object_reference),
    $._encrypt_clause,
    $.keyword_decrypt,
    $.annotations_clause,
  )),

  _oracle_references: $ => seq(
    $.keyword_references,
    $.object_reference,
    optional(paren_list($.identifier, true)),
    repeat(
      seq(
        $.keyword_on,
        $.keyword_delete,
        choice(
          $.keyword_cascade,
          seq($.keyword_set, $.keyword_null),
        ),
      ),
    ),
  ),

  // CHECK (condition); the CONSTRAINT name prefix belongs to the caller.
  _check_constraint: $ => seq(
    $.keyword_check,
    wrapped_in_parenthesis($._expression),
  ),

  // DEFAULT [ON NULL [FOR INSERT AND UPDATE]] expr
  _default_expression: $ => seq(
    $.keyword_default,
    optional(seq(
      $.keyword_on, $.keyword_null,
      optional(seq($.keyword_for, $.keyword_insert, $.keyword_and, $.keyword_update)),
    )),
    choice(
      $._inner_default_expression,
      wrapped_in_parenthesis($._inner_default_expression),
      $.field,
    ),
  ),

  _identity_option: $ => choice(
    seq($.keyword_start, $.keyword_with, choice(alias($._integer, $.literal), seq($.keyword_limit, $.keyword_value))),
    seq($.keyword_increment, $.keyword_by, alias($._integer, $.literal)),
    seq($.keyword_maxvalue, alias($._integer, $.literal)),
    $.keyword_nomaxvalue,
    seq($.keyword_minvalue, alias($._integer, $.literal)),
    $.keyword_nominvalue,
    $.keyword_cycle,
    $.keyword_nocycle,
    seq($.keyword_cache, alias($._integer, $.literal)),
    $.keyword_nocache,
    $.keyword_order,
    $.keyword_noorder,
  ),

  // ENCRYPT [USING 'alg'] [IDENTIFIED BY pw] ['integrity'] [[NO] SALT]
  _encrypt_clause: $ => seq(
    $.keyword_encrypt,
    optional(seq($.keyword_using, $.literal)),
    optional(seq($.keyword_identified, $.keyword_by, $.identifier)),
    optional($.literal),
    optional(seq(optional($.keyword_no), $.keyword_salt)),
  ),

  // ANNOTATIONS (name ['value'] [, …]); ALTER forms prefix each with ADD / DROP / REPLACE
  annotations_clause: $ => seq(
    $.keyword_annotations,
    paren_list($.annotation, true),
  ),

  annotation: $ => seq(
    optional(choice($.keyword_add, $.keyword_drop, $.keyword_replace)),
    field('name', $.identifier),
    optional(field('value', alias($._literal_string, $.literal))),
  ),

  // ── Constraints ────────────────────────────────────────────────────────

  // Out-of-line constraints take the same state clauses as inline ones.
  constraint: $ => seq(
    choice(
      $._constraint_literal,
      $._key_constraint,
      $._primary_key_constraint,
      $._check_constraint,
    ),
    repeat($._constraint_state),
  ),

  _constraint_literal: $ => seq(
    $.keyword_constraint,
    field('name', $.identifier),
    choice(
      seq($._primary_key, $.ordered_columns),
      seq($.keyword_unique, $.ordered_columns),
      $._check_constraint,
      seq(
        optional($.keyword_foreign),
        $.keyword_key,
        $.ordered_columns,
        $._oracle_references,
      ),
    ),
  ),

  // [NOT] DEFERRABLE, INITIALLY {IMMEDIATE | DEFERRED}, RELY | NORELY,
  // USING INDEX …, ENABLE | DISABLE, VALIDATE | NOVALIDATE, EXCEPTIONS INTO t
  _constraint_state: $ => choice(
    seq(optional($.keyword_not), $.keyword_deferrable),
    seq($.keyword_initially, choice($.keyword_immediate, $.keyword_deferred)),
    $.keyword_rely,
    $.keyword_norely,
    $.keyword_enable,
    $.keyword_disable,
    $.keyword_validate,
    $.keyword_novalidate,
    seq($.keyword_exceptions, $.keyword_into, $.object_reference),
    seq(
      $.keyword_using, $.keyword_index,
      optional(choice(
        wrapped_in_parenthesis($.create_index),
        repeat1($._oracle_physical_attribute),
        $.object_reference,
      )),
    ),
  ),

  // ── Table properties ───────────────────────────────────────────────────

  // GLOBAL TEMPORARY | PRIVATE TEMPORARY | TEMP[ORARY] | DUPLICATED | SHARDED
  _oracle_table_kind: $ => choice(
    $._temporary,
    seq($.keyword_global, $.keyword_temporary),
    seq($.keyword_private, $.keyword_temporary),
    $.keyword_duplicated,
    $.keyword_sharded,
  ),

  // SHARING = {METADATA | DATA | EXTENDED DATA | NONE}
  sharing_clause: $ => seq(
    $.keyword_sharing, '=',
    choice(
      $.keyword_metadata,
      $.keyword_data,
      seq($.keyword_extended, $.keyword_data),
      $.keyword_none,
    ),
  ),

  // ON COMMIT {DELETE | PRESERVE} ROWS | ON COMMIT {DROP | PRESERVE} DEFINITION
  on_commit_clause: $ => seq(
    $.keyword_on, $.keyword_commit,
    choice(
      seq(choice($.keyword_delete, $.keyword_preserve), $.keyword_rows),
      seq(choice($.keyword_drop, $.keyword_preserve), $.keyword_definition),
    ),
  ),

  // The table-level clauses after the column list, accepted in any order.
  _oracle_table_property: $ => choice(
    $._oracle_physical_attribute,
    $.on_commit_clause,
    $.organization_clause,
    $.table_partition_by,
    $.compression_clause,
    $.inmemory_clause,
    $.annotations_clause,
    seq(choice($.keyword_enable, $.keyword_disable), $.keyword_row, $.keyword_movement),
    $.keyword_rowdependencies,
    $.keyword_norowdependencies,
    seq($.keyword_segment, $.keyword_creation, choice($.keyword_immediate, $.keyword_deferred)),
    seq(optional($.keyword_no), $.keyword_flashback, $.keyword_archive, optional($.identifier)),
    seq($.keyword_result_cache, wrapped_in_parenthesis(seq($.keyword_mode, choice($.keyword_default, $.keyword_force)))),
    seq($.keyword_read, choice($.keyword_only, $.keyword_write)),
    seq($.keyword_row, $.keyword_archival),
  ),

  // [ROW STORE | COLUMN STORE] COMPRESS [BASIC | ADVANCED | FOR {OLTP | QUERY | ARCHIVE} [LOW | HIGH]] | NOCOMPRESS
  compression_clause: $ => choice(
    $.keyword_nocompress,
    seq(
      optional(seq(choice($.keyword_row, $.keyword_column), $.keyword_store)),
      $.keyword_compress,
      optional(choice(
        $.keyword_basic,
        $.keyword_advanced,
        seq(
          $.keyword_for,
          choice($.keyword_oltp, $.keyword_query, $.keyword_archive),
          optional(choice($.keyword_low, $.keyword_high)),
        ),
      )),
    ),
  ),

  // INMEMORY [MEMCOMPRESS FOR {DML | QUERY | CAPACITY} [LOW | HIGH] | NO MEMCOMPRESS] [PRIORITY level] | NO INMEMORY
  inmemory_clause: $ => choice(
    seq($.keyword_no, $.keyword_inmemory),
    seq(
      $.keyword_inmemory,
      repeat(choice(
        seq(
          $.keyword_memcompress, $.keyword_for,
          choice($.keyword_dml, $.keyword_query, $.keyword_capacity),
          optional(choice($.keyword_low, $.keyword_high)),
        ),
        seq($.keyword_no, $.keyword_memcompress),
        seq(
          $.keyword_priority,
          choice($.keyword_none, $.keyword_low, $.keyword_medium, $.keyword_high, $.keyword_critical),
        ),
      )),
    ),
  ),

};
