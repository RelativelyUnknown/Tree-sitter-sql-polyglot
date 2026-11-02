"""Reverts one part of the analytic / CAST batch in the CI checkout only (throwaway experiment), to measure
what each part costs in states and in the u16 action index."""
import re, sys

v = sys.argv[1]

def sub(path, old, new, count=1):
    text = open(path).read()
    assert old in text, (path, old)
    open(path, 'w').write(text.replace(old, new, count))

if v == 'no_invocation_nulls':
    sub('oracle/grammar/plsql.js', "            optional($._nulls_treatment),\n", "")
elif v == 'no_window_function_nulls':
    sub('oracle/grammar/select_clauses.js', "    $.invocation,\n    optional($._nulls_treatment),\n    $.keyword_over,", "    $.invocation,\n    $.keyword_over,")
elif v == 'no_frame_interval':
    sub('oracle/grammar/select_clauses.js', "          $.interval,\n", "", count=2)
elif v == 'no_cast_default':
    sub('oracle/grammar/expr_extras.js', "    optional(seq($.keyword_default, $._expression, $.keyword_on, $.keyword_conversion, $.keyword_error)),\n    optional(seq(',', $._expression, optional(seq(',', $._expression)))),\n", "")
else:
    raise SystemExit('unknown variant ' + v)
print('applied', v)
