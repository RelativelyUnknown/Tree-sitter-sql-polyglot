import { comma_list } from '../../grammar/helpers.js';

export default {

  // UNLOAD (select_query) TO 's3://path' WITH (k = v, ...)
  unload_statement: $ => seq(
    $.keyword_unload,
    '(',
    $._dml_read,
    ')',
    $.keyword_to,
    field('path', alias($._literal_string, $.literal)),
    optional($.with_properties),
  ),

  // MSCK REPAIR TABLE table_ref [ADD | DROP | SYNC PARTITIONS]
  msck_repair_statement: $ => seq(
    $.keyword_msck,
    $.keyword_repair,
    $.keyword_table,
    $.object_reference,
    optional(seq(
      choice($.keyword_add, $.keyword_drop, $.keyword_sync),
      $.keyword_partitions,
    )),
  ),

};
