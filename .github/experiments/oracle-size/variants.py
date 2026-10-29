"""Replaces the cast override of oracle/grammar/expr_extras.js with one extension at a time in the CI
checkout only (throwaway experiment), to measure what each CAST extension costs in states and in
the u16 action index. 'plain' is the base CAST."""
import re, sys

PARAM = "field('parameter', $._expression)"
TYPE = "$._type"
TAIL = ""
v = sys.argv[1]
if v == 'multiset':
    PARAM = "field('parameter', choice($._expression, seq($.keyword_multiset, $.subquery)))"
elif v == 'domain':
    TYPE = "choice($._type, seq($.keyword_domain, $.object_reference))"
elif v == 'default':
    TAIL = "optional(seq($.keyword_default, $._expression, $.keyword_on, $.keyword_conversion, $.keyword_error)),"
elif v == 'format':
    TAIL = "optional(seq(',', $._expression, optional(seq(',', $._expression)))),"
elif v != 'plain':
    raise SystemExit('unknown variant ' + v)

new = """  cast: $ => seq(
    field('name', $.keyword_cast),
    '(',
    %s,
    $.keyword_as,
    %s,
    %s
    ')',
  ),

""" % (PARAM, TYPE, TAIL)
path = 'oracle/grammar/expr_extras.js'
text = open(path).read()
a = text.index('  cast: $ => seq(')
b = text.index('  _qualified_choice:')
open(path, 'w').write(text[:a] + new + text[b:])
print('cast variant', v)
