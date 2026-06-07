import { paren_list } from '../../grammar/helpers.js';

export default {

  show_statement: $ => seq(
    $.keyword_show,
    choice(
      // SHOW PARTITIONS table [PARTITION (k=v, ...)]
      seq(
        $.keyword_partitions,
        field('table', $.object_reference),
        optional(seq(
          $.keyword_partition,
          paren_list($.table_option, true),
        )),
      ),
      // SHOW TBLPROPERTIES table [('key')]
      seq(
        $.keyword_tblproperties,
        field('table', $.object_reference),
        optional(seq('(', alias($._literal_string, $.literal), ')')),
      ),
      // SHOW CREATE TABLE table
      seq(
        $.keyword_create,
        $.keyword_table,
        field('table', $.object_reference),
      ),
      // SHOW DATABASES [LIKE 'pattern']
      seq(
        $.keyword_databases,
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
      ),
      // SHOW TABLES [IN db] [LIKE 'pattern']
      seq(
        $.keyword_tables,
        optional(seq($.keyword_in, field('db', $.object_reference))),
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
      ),
      // SHOW FUNCTIONS [LIKE 'pattern']
      seq(
        $.keyword_functions,
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
      ),
    ),
  ),

};
