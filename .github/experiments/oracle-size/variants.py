"""Disables one rule override of oracle/grammar/expr_extras.js in the CI checkout only (throwaway
experiment): the override key is renamed so the rule is unreferenced and tree-sitter prunes it, and
the base rule takes over. Measures what each override costs in states and in the u16 action index."""
import re, sys

GROUPS = {
    'no_qualified': ['_qualified_choice'],
    'no_type': ['_type'],
    'no_cast': ['cast'],
    'no_numbers': ['_integer', '_decimal_number'],
    'no_interval': ['interval'],
    'no_into': ['_into_target'],
}
path = 'oracle/grammar/expr_extras.js'
text = open(path).read()
for n in GROUPS[sys.argv[1]]:
    text, k = re.subn(r'(?m)^  %s: \$ =>' % re.escape(n), '  _x%s: $ =>' % n, text)
    assert k == 1, n
open(path, 'w').write(text)
print('disabled', GROUPS[sys.argv[1]])
