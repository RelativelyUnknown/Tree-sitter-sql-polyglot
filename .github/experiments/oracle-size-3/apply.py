"""Variants of the grammar at 9f57343 (all three features on). Usage: apply.py <variant>"""
import sys
v = sys.argv[1]
def sub(path, old, new):
    s = open(path).read()
    assert old in s, (path, old[:70])
    open(path, 'w').write(s.replace(old, new, 1))

OPT = "    optional($._json_condition_option_0),\n"
LITE = "    optional(choice($.keyword_strict, $.keyword_lax)),\n"
SCALARS = "    $ => seq(choice($.keyword_allow, $.keyword_disallow), $.keyword_scalars),\n"

def no_remote():
    sub('oracle/grammar.js', "      $.remote_reference,\n", "")
    sub('oracle/grammar/plsql.js', ", $.match_navigation),", "),")

if v == 'lite':                      # dot path + set operand tail + IS JSON STRICT|LAX only
    sub('oracle/grammar/json.js', OPT, LITE)
elif v == 'lite_noremote':
    sub('oracle/grammar/json.js', OPT, LITE); no_remote()
elif v == 'full_noremote':           # the whole IS JSON chain, minus the two rare forms
    no_remote()
elif v == 'keys_noremote':           # STRICT|LAX and UNIQUE KEYS, minus the two rare forms
    sub('oracle/grammar/json.js', SCALARS, ""); no_remote()
else:
    raise SystemExit('unknown variant ' + v)
