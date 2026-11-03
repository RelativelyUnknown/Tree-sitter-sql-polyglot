import { comma_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// SQL/XML functions with their own argument syntax (Oracle SQL Language Reference 26ai): XMLQUERY, XMLEXISTS,
// XMLCAST, XMLSERIALIZE, XMLPARSE and the XMLNAMESPACES prefix of XMLTABLE. XMLELEMENT, XMLAGG and the rest are
// ordinary function calls.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_xmlquery:      _ => kw('xmlquery'),
  keyword_xmlexists:     _ => kw('xmlexists'),
  keyword_xmlcast:       _ => kw('xmlcast'),
  keyword_xmlserialize:  _ => kw('xmlserialize'),
  keyword_xmlparse:      _ => kw('xmlparse'),
  keyword_xmlnamespaces: _ => kw('xmlnamespaces'),
  keyword_document:      _ => kw('document'),
  keyword_content:       _ => kw('content'),
  keyword_wellformed:    _ => kw('wellformed'),
  keyword_encoding:      _ => kw('encoding'),
  keyword_indent:        _ => kw('indent'),
  keyword_hide:          _ => kw('hide'),
  keyword_defaults:      _ => kw('defaults'),

  // XMLQUERY('xquery' [PASSING [BY VALUE] expr [AS id], …] RETURNING CONTENT [NULL ON EMPTY])
  xmlquery: $ => seq(
    $.keyword_xmlquery,
    '(',
    alias($._literal_string, $.literal),
    optional($._xml_passing),
    $.keyword_returning, $.keyword_content,
    optional(seq($.keyword_null, $.keyword_on, $.keyword_empty)),
    ')',
  ),

  // XMLEXISTS('xquery' [PASSING [BY VALUE] expr [AS id], …])
  xmlexists: $ => seq(
    $.keyword_xmlexists,
    '(',
    alias($._literal_string, $.literal),
    optional($._xml_passing),
    ')',
  ),

  _xml_passing: $ => seq(
    $.keyword_passing,
    optional(seq($.keyword_by, $.keyword_value)),
    comma_list(seq($._expression, optional(seq($.keyword_as, $.identifier))), true),
  ),

  // XMLCAST(expr AS datatype)
  xmlcast: $ => seq($.keyword_xmlcast, '(', $._expression, $.keyword_as, $._type, ')'),

  // XMLSERIALIZE({DOCUMENT | CONTENT} expr [AS type] [ENCODING 'e'] [VERSION 'v'] [NO INDENT | INDENT [SIZE = n]] [HIDE | SHOW DEFAULTS])
  xmlserialize: $ => seq(
    $.keyword_xmlserialize,
    '(',
    choice($.keyword_document, $.keyword_content),
    $._expression,
    optional(seq($.keyword_as, $._type)),
    repeat($._xmlserialize_option),
    ')',
  ),

  _xmlserialize_option: $ => choice(
    seq($.keyword_encoding, alias($._literal_string, $.literal)),
    seq($.keyword_version, alias($._literal_string, $.literal)),
    seq($.keyword_no, $.keyword_indent),
    seq($.keyword_indent, optional(seq($.keyword_size, '=', alias($._natural_number, $.literal)))),
    seq(choice($.keyword_hide, $.keyword_show), $.keyword_defaults),
  ),

  // XMLPARSE({DOCUMENT | CONTENT} expr [WELLFORMED])
  xmlparse: $ => seq(
    $.keyword_xmlparse,
    '(',
    choice($.keyword_document, $.keyword_content),
    $._expression,
    optional($.keyword_wellformed),
    ')',
  ),

  // XMLNAMESPACES('uri' AS prefix, …, [DEFAULT 'uri'])
  xml_namespaces: $ => seq(
    $.keyword_xmlnamespaces,
    '(',
    comma_list(choice(
      seq(alias($._literal_string, $.literal), $.keyword_as, $.identifier),
      seq($.keyword_default, alias($._literal_string, $.literal)),
    ), true),
    ')',
  ),

};
