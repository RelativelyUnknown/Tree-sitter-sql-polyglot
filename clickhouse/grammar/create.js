import { comma_list, paren_list } from '../../grammar/helpers.js';

export default {

  // Override _create_statement to add ClickHouse-specific CREATE variants
  _create_statement: $ => seq(
    choice(
      $.create_table,
      $.create_view,
      $.create_materialized_view,
      $.create_live_view,
      $.create_index,
      $.create_function,
      $.create_procedure,
      $.create_type,
      $.create_database,
      $.create_role,
      $.create_sequence,
      $.create_trigger,
      $.create_dictionary,
      prec.left(seq(
        $.create_schema,
        repeat($._create_statement),
      )),
    ),
  ),

  // Override create_table to add ENGINE clause + ON CLUSTER + ClickHouse table clauses
  create_table: $ => prec.left(
    seq(
      $.keyword_create,
      optional($._temporary),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      optional($.on_cluster),
      seq(
        optional($.column_definitions),
        optional(seq($.keyword_as, $.create_query)),
      ),
      optional($.engine_clause),
      repeat($._table_clause),
    ),
  ),

  // ENGINE = EngineName[(args)]
  engine_clause: $ => seq(
    $.keyword_engine,
    '=',
    field('engine', choice($.invocation, $.identifier)),
  ),

  // Trailing CREATE TABLE clauses (order-independent, repeatable)
  _table_clause: $ => choice(
    $.order_by,
    $.partition_by,
    $.primary_key_clause,
    $.sample_by_clause,
    $.ttl_clause,
    $.settings_clause,
  ),

  primary_key_clause: $ => seq(
    $.keyword_primary,
    $.keyword_key,
    choice(
      $.list,
      $._expression,
    ),
  ),

  sample_by_clause: $ => seq(
    $.keyword_sample,
    $.keyword_by,
    $._expression,
  ),

  // TTL <expr> [DELETE | TO DISK '...' | TO VOLUME '...'] [, ...]
  ttl_clause: $ => seq(
    $.keyword_ttl,
    comma_list($.ttl_item, true),
  ),

  ttl_item: $ => seq(
    $._expression,
    optional(choice(
      $.keyword_delete,
      seq($.keyword_to, $.keyword_disk, alias($._literal_string, $.literal)),
      seq($.keyword_to, $.keyword_volume, alias($._literal_string, $.literal)),
    )),
  ),

  // ON CLUSTER cluster_name
  on_cluster: $ => seq(
    $.keyword_on,
    $.keyword_cluster,
    field('cluster', choice($.identifier, alias($._literal_string, $.literal))),
  ),

  // Override create_materialized_view to support TO target_table and ENGINE
  create_materialized_view: $ => prec.right(
    seq(
      $.keyword_create,
      optional($._or_replace),
      $.keyword_materialized,
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional($.on_cluster),
      choice(
        // MATERIALIZED VIEW mv TO target AS SELECT ...
        seq(
          $.keyword_to,
          field('target', $.object_reference),
          $.keyword_as,
          $.create_query,
        ),
        // MATERIALIZED VIEW mv [ENGINE = ...] [POPULATE] AS SELECT ...
        seq(
          optional($.engine_clause),
          optional($.keyword_populate),
          $.keyword_as,
          $.create_query,
        ),
      ),
    ),
  ),

  // CREATE LIVE VIEW v [ON CLUSTER ...] AS SELECT ...
  create_live_view: $ => prec.right(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_live,
    $.keyword_view,
    optional($._if_not_exists),
    $.object_reference,
    optional($.on_cluster),
    $.keyword_as,
    $.create_query,
  )),

  // CREATE DICTIONARY name (cols) PRIMARY KEY id
  //   SOURCE(...) LAYOUT(...) LIFETIME(...)
  create_dictionary: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_dictionary,
    optional($._if_not_exists),
    $.object_reference,
    optional($.on_cluster),
    optional($.column_definitions),
    repeat($._dictionary_clause),
  )),

  _dictionary_clause: $ => choice(
    seq($.keyword_primary, $.keyword_key, comma_list($.identifier, true)),
    seq($.keyword_source, '(', $._dictionary_arg, ')'),
    seq($.keyword_layout, '(', optional($._dictionary_arg), ')'),
    seq($.keyword_lifetime, '(', $._dictionary_lifetime, ')'),
  ),

  // SOURCE(CLICKHOUSE(TABLE 'x' ...)) / LAYOUT(FLAT()) — nested function-like args
  _dictionary_arg: $ => seq(
    field('name', $.identifier),
    '(',
    repeat(choice(
      $._dictionary_arg,
      $.keyword_table,
      $.identifier,
      $.literal,
      alias($._literal_string, $.literal),
    )),
    ')',
  ),

  // LIFETIME(300) | LIFETIME(MIN 300 MAX 600)
  _dictionary_lifetime: $ => choice(
    alias($._natural_number, $.literal),
    seq(
      $.keyword_min, alias($._natural_number, $.literal),
      $.keyword_max, alias($._natural_number, $.literal),
    ),
  ),

};
