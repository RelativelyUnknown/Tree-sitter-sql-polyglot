import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';

// DROP variants with IF EXISTS / CASCADE, RENAME, ALTER / DROP PROPERTY GRAPH, Iceberg tables,
// hybrid vector indexes and :NEW.col / :OLD.col trigger references (Oracle SQL Language Reference
// 26ai). The DROP rules replace the generic ones and keep every form those accepted.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_bucket:  _ => kw('bucket'),
  keyword_hybrid:  _ => kw('hybrid'),
  keyword_iceberg: _ => kw('iceberg'),

  _oracle_misc_statement: $ => choice(
    $.rename_object_statement,
    $.alter_property_graph_statement,
    $.drop_property_graph_statement,
    $.create_iceberg_table_statement,
    $.drop_iceberg_table_statement,
    $.create_hybrid_vector_index_statement,
  ),

  // :NEW.c and :OLD.c inside triggers
  bind_record_field: $ => seq($.parameter, '.', $.identifier),

  assignment_statement: $ => seq(
    field('target', choice(
      $.identifier,
      $._qualified_field,
      $.parameter,
      $.invocation,
      seq($.parameter, ':', $.identifier),
      $.bind_record_field,
    )),
    ':=',
    field('value', $._expression),
  ),

  // ── DROP variants ──────────────────────────────────────────────────────

  drop_role: $ => seq(
    $.keyword_drop,
    choice($.keyword_group, $.keyword_role, $.keyword_user),
    optional($._if_exists),
    $.identifier,
    optional($.keyword_cascade),
  ),

  drop_database_link_statement: $ => seq(
    $.keyword_drop,
    optional($.keyword_public),
    $.keyword_database,
    $.keyword_link,
    optional($._if_exists),
    $.object_reference,
  ),

  drop_directory_statement: $ => seq(
    $.keyword_drop,
    $.keyword_directory,
    optional($._if_exists),
    field('name', $.identifier),
  ),

  drop_package: $ => seq(
    $.keyword_drop,
    $.keyword_package,
    choice(
      seq(optional($._if_exists), optional($.keyword_body)),
      seq($.keyword_body, $._if_exists),
    ),
    $.object_reference,
  ),

  // RENAME old TO new
  rename_object_statement: $ => seq(
    $.keyword_rename,
    $.object_reference,
    $.keyword_to,
    $.object_reference,
  ),

  // ── Property graphs ────────────────────────────────────────────────────

  alter_property_graph_statement: $ => seq(
    $.keyword_alter, $.keyword_property, $.keyword_graph,
    optional($._if_exists),
    field('name', $.object_reference),
    $.keyword_compile,
  ),

  drop_property_graph_statement: $ => seq(
    $.keyword_drop, $.keyword_property, $.keyword_graph,
    optional($._if_exists),
    field('name', $.object_reference),
  ),

  // ── Iceberg tables ─────────────────────────────────────────────────────

  create_iceberg_table_statement: $ => seq(
    $.keyword_create, $.keyword_iceberg, $.keyword_table,
    optional($._if_not_exists),
    field('name', $.object_reference),
    paren_list(seq($.identifier, choice($._type, $.keyword_string)), true),
    optional(seq($.keyword_within, $.keyword_catalog, $.identifier)),
    optional(seq($.keyword_storage, $.keyword_location, choice($.identifier, alias($._literal_string, $.literal)))),
    optional(seq(
      $.keyword_partition, $.keyword_by,
      comma_list($._iceberg_transform, true),
    )),
  ),

  _iceberg_transform: $ => choice(
    seq(
      choice($.keyword_year, $.keyword_month, $.keyword_day, $.keyword_hour),
      paren_list($.identifier, true),
    ),
    seq($.keyword_bucket, '(', alias($._natural_number, $.literal), ',', $.identifier, ')'),
    $.identifier,
  ),

  drop_iceberg_table_statement: $ => seq(
    $.keyword_drop, $.keyword_iceberg, $.keyword_table,
    optional($._if_exists),
    field('name', $.object_reference),
    optional(seq($.keyword_within, $.keyword_catalog, $.identifier)),
    optional($.keyword_purge),
  ),

  // ── Hybrid vector index ────────────────────────────────────────────────

  create_hybrid_vector_index_statement: $ => seq(
    $.keyword_create, $.keyword_hybrid, $.keyword_vector, $.keyword_index,
    optional($._if_not_exists),
    field('name', $.object_reference),
    $.keyword_on,
    $.object_reference,
    paren_list($.identifier, true),
    optional(seq($.keyword_parameters, '(', alias($._literal_string, $.literal), ')')),
  ),

};
