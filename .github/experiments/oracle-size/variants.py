"""Reverts one of the recent Oracle batches in the CI checkout only (throwaway experiment), to measure
what each costs in states and in the u16 action index. Needs the full git history (fetch-depth 0).
BASE is the last commit before the MATCH_RECOGNIZE / select clauses / PIVOT batches."""
import re, subprocess, sys

BASE = '6983989'
v = sys.argv[1]

def show(path):
    return subprocess.check_output(['git', 'show', f'{BASE}:{path}']).decode()

def rename(path, keys):
    text = open(path).read()
    for k in keys:
        text, n = re.subn(r'(?m)^  %s: ' % re.escape(k), '  _x%s: ' % k, text)
        assert n == 1, k
    open(path, 'w').write(text)

SC = 'oracle/grammar/select_clauses.js'
if v == 'no_match_recognize':
    open('oracle/grammar/match_recognize.js', 'w').write(show('oracle/grammar/match_recognize.js'))
elif v == 'no_pivot':
    cur = open('oracle/grammar.js').read()
    old = show('oracle/grammar.js')
    def block(t):
        a = t.index('    // PIVOT')
        b = t.index('    keyword_pivot:   _ =>')
        return a, b
    ca, cb = block(cur)
    oa, ob = block(old)
    open('oracle/grammar.js', 'w').write(cur[:ca] + old[oa:ob] + cur[cb:])
elif v == 'no_cte':
    rename(SC, ['cte'])
elif v == 'no_fetch':
    rename(SC, ['offset_fetch_clause', '_fetch_first_clause'])
elif v == 'no_window':
    rename(SC, ['window_clause', 'window_specification'])
else:
    raise SystemExit('unknown variant ' + v)
print('applied', v)
