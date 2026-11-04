"""Switch the three features of 9f57343 off, per variant, then print nothing. Usage: apply.py <variant>"""
import re, sys
v = sys.argv[1]
def sub(path, old, new):
    s = open(path).read()
    assert old in s, (path, old[:60])
    open(path, 'w').write(s.replace(old, new, 1))

if v in ('no_json_opts', 'none'):
    sub('oracle/grammar/json.js', "    optional($._json_condition_option_0),\n", "")
if v in ('no_dot_path', 'none'):
    sub('oracle/grammar.js', "      $.json_dot_path,\n", "")
if v in ('no_set_b', 'none'):
    sub('oracle/grammar/select_clauses.js', """    // a parenthesised last operand may be followed by the ORDER BY / row limiting of the whole set operation:
    // (SELECT …) UNION (SELECT …) ORDER BY 1
    seq(
      $._select_statement,
      repeat($._set_operand),
      $._set_operator,
      wrapped_in_parenthesis($._select_core),
      $._set_operation_tail,
    ),
""", "")
