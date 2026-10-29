"""Replaces the cast override of oracle/grammar/expr_extras.js with one extension at a time in the CI
checkout only (throwaway experiment), to measure what each CAST extension costs in states and in
the u16 action index. 'plain' is the base CAST."""
import re, sys

PARAM = "field('parameter', $._expression)"
TYPE = "$._type"
TAIL = ""
v = sys.argv[1]
MULTISET = "field('parameter', choice($._expression, seq($.keyword_multiset, $.subquery)))"
DOMAIN = "choice($._type, seq($.keyword_domain, $.object_reference))"
DEFAULT = "optional(seq($.keyword_default, $._expression, $.keyword_on, $.keyword_conversion, $.keyword_error)),"
FORMAT = "optional(seq(',', $._expression, optional(seq(',', $._expression)))),"
parts = set(v.split('+')) if v != 'plain' else set()
if 'multiset' in parts: PARAM = MULTISET
if 'domain' in parts: TYPE = DOMAIN
if 'default' in parts: TAIL += DEFAULT
if 'format' in parts: TAIL += FORMAT
assert parts <= {'multiset', 'domain', 'default', 'format'}, v

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
