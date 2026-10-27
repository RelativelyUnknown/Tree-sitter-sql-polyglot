import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// CREATE PROPERTY GRAPH, CREATE VECTOR INDEX and ALTER JSON RELATIONAL DUALITY VIEW (Oracle SQL
// Language Reference 26ai). Reached through _oracle_admin_statement.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_accuracy:        _ => kw('accuracy'),
  keyword_are:             _ => kw('are'),
  keyword_dot:             _ => kw('dot'),
  keyword_options:         _ => kw('options'),
  keyword_properties:      _ => kw('properties'),
  keyword_types:           _ => kw('types'),
  keyword_cosine:          _ => kw('cosine'),
  keyword_destination:     _ => kw('destination'),
  keyword_distance:        _ => kw('distance'),
  keyword_distribute:      _ => kw('distribute'),
  keyword_duality:         _ => kw('duality'),
  keyword_duplicate:       _ => kw('duplicate'),
  keyword_edge:            _ => kw('edge'),
  keyword_efconstruction:  _ => kw('efconstruction'),
  keyword_euclidean:       _ => kw('euclidean'),
  keyword_euclidean_squared: _ => kw('euclidean_squared'),
  keyword_hamming:         _ => kw('hamming'),
  keyword_hnsw:            _ => kw('hnsw'),
  keyword_ivf:             _ => kw('ivf'),
  keyword_label:           _ => kw('label'),
  keyword_logical:         _ => kw('logical'),
  keyword_manhattan:       _ => kw('manhattan'),
  keyword_min_vectors_per_partition: _ => kw('min_vectors_per_partition'),
  keyword_mixed:           _ => kw('mixed'),
  keyword_neighbor:        _ => kw('neighbor'),
  keyword_neighbors:       _ => kw('neighbors'),
  keyword_relational:      _ => kw('relational'),
  keyword_replication:     _ => kw('replication'),
  keyword_samples_per_partition: _ => kw('samples_per_partition'),
  keyword_vector:          _ => kw('vector'),
  keyword_vertex:          _ => kw('vertex'),

  // ── Property graph ─────────────────────────────────────────────────────

  create_property_graph_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_property,
    $.keyword_graph,
    optional($._if_not_exists),
    field('name', $.object_reference),
    $.keyword_vertex, $.keyword_tables, paren_list($.graph_vertex_table, true),
    optional(seq($.keyword_edge, $.keyword_tables, paren_list($.graph_edge_table, true))),
    optional(seq($.keyword_options, paren_list($._graph_option, true))),
  ),

  graph_vertex_table: $ => seq(
    $.object_reference,
    optional(seq($.keyword_as, $.identifier)),
    optional($._graph_key),
    optional(choice(repeat1($._graph_label), $._graph_properties)),
  ),

  graph_edge_table: $ => seq(
    $.object_reference,
    optional(seq($.keyword_as, $.identifier)),
    optional($._graph_key),
    $.keyword_source,
    optional($._graph_key),
    optional(seq($.keyword_references, $.object_reference, optional(paren_list($.identifier, true)))),
    optional($.object_reference),
    $.keyword_destination,
    optional($._graph_key),
    optional(seq($.keyword_references, $.object_reference, optional(paren_list($.identifier, true)))),
    optional($.object_reference),
    optional(choice(repeat1($._graph_label), $._graph_properties)),
  ),

  _graph_key: $ => seq($.keyword_key, paren_list($.identifier, true)),

  // DEFAULT LABEL | LABEL name, each with an optional property list
  _graph_label: $ => seq(
    choice(seq($.keyword_default, $.keyword_label), seq($.keyword_label, $.identifier)),
    optional($._graph_properties),
  ),

  // PROPERTIES [ARE] ALL COLUMNS [EXCEPT (cols)] | PROPERTIES (expr [AS alias], …) | NO PROPERTIES
  _graph_properties: $ => choice(
    seq($.keyword_no, $.keyword_properties),
    seq(
      $.keyword_properties,
      choice(
        seq(
          optional($.keyword_are), $.keyword_all, $.keyword_columns,
          optional(seq($.keyword_except, paren_list($.identifier, true))),
        ),
        paren_list(seq($._expression, optional(seq($.keyword_as, $.identifier))), true),
      ),
    ),
  ),

  _graph_option: $ => choice(
    seq(choice($.keyword_enforced, $.keyword_trusted), $.keyword_mode),
    seq(optional(choice($.keyword_allow, $.keyword_disallow)), $.keyword_mixed, $.keyword_property, $.keyword_types),
  ),

  // ── Vector index ───────────────────────────────────────────────────────

  create_vector_index_statement: $ => seq(
    $.keyword_create,
    $.keyword_vector,
    $.keyword_index,
    optional($._if_not_exists),
    field('name', $.object_reference),
    $.keyword_on,
    $.object_reference,
    paren_list($.identifier, true),
    repeat(choice(
      seq($.keyword_include, paren_list($.identifier, true)),
      seq(
        $.keyword_organization,
        choice(
          seq($.keyword_inmemory, $.keyword_neighbor, $.keyword_graph),
          seq($.keyword_neighbor, $.keyword_partitions),
        ),
      ),
      seq(
        $.keyword_distance,
        choice(
          $.keyword_euclidean, $.keyword_euclidean_squared, $.keyword_cosine, $.keyword_dot,
          $.keyword_manhattan, $.keyword_hamming,
        ),
      ),
      seq($.keyword_with, $.keyword_target, $.keyword_accuracy, alias($._natural_number, $.literal)),
      seq($.keyword_parameters, paren_list($._vector_parameter, true)),
      seq($.keyword_parallel, alias($._natural_number, $.literal)),
      $.keyword_online,
      $.keyword_local,
      seq($.keyword_distribute, $.keyword_by, choice($.keyword_partition, $.keyword_subpartition, $.keyword_rowid)),
      seq($.keyword_duplicate, choice($.keyword_all, $.keyword_none)),
    )),
  ),

  _vector_parameter: $ => choice(
    seq($.keyword_type, choice($.keyword_hnsw, $.keyword_ivf)),
    seq($.keyword_neighbors, alias($._natural_number, $.literal)),
    seq($.keyword_efconstruction, alias($._natural_number, $.literal)),
    seq($.keyword_neighbor, $.keyword_partitions, alias($._natural_number, $.literal)),
    seq($.keyword_samples_per_partition, alias($._natural_number, $.literal)),
    seq($.keyword_min_vectors_per_partition, alias($._natural_number, $.literal)),
    seq($.keyword_neighbor, $.keyword_partition, $.keyword_grouping, choice($.keyword_on, $.keyword_off)),
  ),

  // ── JSON relational duality view ───────────────────────────────────────

  alter_duality_view_statement: $ => seq(
    $.keyword_alter,
    $.keyword_json,
    $.keyword_relational,
    $.keyword_duality,
    $.keyword_view,
    optional($._if_exists),
    field('name', $.object_reference),
    choice($.keyword_enable, $.keyword_disable),
    $.keyword_logical,
    $.keyword_replication,
  ),

};
