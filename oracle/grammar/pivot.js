import { paren_list, comma_list } from '../../grammar/helpers.js';

export default {

  // Oracle PIVOT clause
  // PIVOT (
  //   agg_fn(col) [AS alias] [, agg_fn(col) [AS alias] ...]
  //   FOR { col | (col, ...) }
  //   IN ( { val | (val,...) } [AS alias] [, ...] )
  // )
  oracle_pivot_clause: $ => seq(
    $.keyword_pivot,
    '(',
    comma_list(
      seq(
        $.invocation,
        optional(seq(optional($.keyword_as), field('agg_alias', $.identifier))),
      ),
      true,
    ),
    $.keyword_for,
    choice(
      $.identifier,
      paren_list($.identifier, true),
    ),
    $.keyword_in,
    '(',
    comma_list(
      seq(
        choice(
          paren_list(choice(alias($._literal_string, $.literal), alias($._integer, $.literal)), true),
          alias($._literal_string, $.literal),
          alias($._integer, $.literal),
        ),
        optional(seq(optional($.keyword_as), field('val_alias', $.identifier))),
      ),
      true,
    ),
    ')',
    ')',
  ),

  // Oracle UNPIVOT clause
  // UNPIVOT [INCLUDE NULLS | EXCLUDE NULLS] (
  //   { val_col | (val_col, ...) }
  //   FOR { name_col | (name_col, ...) }
  //   IN ( { col | (col,...) } [AS { val | (val,...) }] [, ...] )
  // )
  oracle_unpivot_clause: $ => seq(
    $.keyword_unpivot,
    optional(choice(
      seq($.keyword_include, $.keyword_nulls),
      seq($.keyword_exclude, $.keyword_nulls),
    )),
    '(',
    choice($.identifier, paren_list($.identifier, true)),
    $.keyword_for,
    choice($.identifier, paren_list($.identifier, true)),
    $.keyword_in,
    '(',
    comma_list(
      seq(
        choice($.identifier, paren_list($.identifier, true)),
        optional(seq(
          optional($.keyword_as),
          choice(
            alias($._literal_string, $.literal),
            paren_list(alias($._literal_string, $.literal), true),
          ),
        )),
      ),
      true,
    ),
    ')',
    ')',
  ),

};
