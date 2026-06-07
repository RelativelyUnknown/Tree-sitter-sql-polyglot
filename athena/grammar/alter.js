import { paren_list, comma_list } from '../../grammar/helpers.js';

// Helper: PARTITION (key = val, ...)
// Reuses the identifier = expression pattern from hive's add_partition.
function partition_spec($) {
  return seq(
    $.keyword_partition,
    paren_list(
      seq($.identifier, '=', $._literal_string),
      true,
    ),
  );
}

export default {

  // ALTER TABLE name ADD [IF NOT EXISTS] PARTITION (k=v, ...) [LOCATION 's3://...']
  //   [PARTITION (k=v, ...) [LOCATION '...']] ...
  athena_add_partition: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    field('name', $.object_reference),
    $.keyword_add,
    optional($._if_not_exists),
    repeat1(
      seq(
        field('partition_spec', $.athena_partition_spec),
        optional(seq(
          $.keyword_location,
          field('location', alias($._literal_string, $.literal)),
        )),
      ),
    ),
  ),

  // ALTER TABLE name DROP [IF EXISTS] PARTITION (k=v, ...) [, PARTITION (k=v, ...) ...]
  athena_drop_partition: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    field('name', $.object_reference),
    $.keyword_drop,
    optional($._if_exists),
    comma_list(
      field('partition_spec', $.athena_partition_spec),
      true,
    ),
  ),

  // ALTER TABLE name PARTITION (k=v, ...) SET LOCATION 's3://...'
  athena_set_partition_location: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    field('name', $.object_reference),
    field('partition_spec', $.athena_partition_spec),
    $.keyword_set,
    $.keyword_location,
    field('location', alias($._literal_string, $.literal)),
  ),

  // ALTER TABLE name PARTITION (k=v, ...) RENAME TO PARTITION (k=newv, ...)
  athena_rename_partition: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    field('name', $.object_reference),
    field('old_spec', $.athena_partition_spec),
    $.keyword_rename,
    $.keyword_to,
    field('new_spec', $.athena_partition_spec),
  ),

  // PARTITION (key = 'val', ...) — shared helper node
  athena_partition_spec: $ => seq(
    $.keyword_partition,
    paren_list(
      seq(
        field('key', $.identifier),
        '=',
        field('value', alias($._literal_string, $.literal)),
      ),
      true,
    ),
  ),

};
