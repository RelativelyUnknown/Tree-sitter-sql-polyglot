"""Drops one group of rules from oracle/grammar/views_tx.js in the CI checkout only (throwaway experiment)."""
import re, sys
GROUPS = {
    'baseline': [],
    'no_views': ['create_view', 'view_column', 'alter_view', 'drop_view'],
    'no_mv': ['mv_refresh_clause', 'create_materialized_view', 'mv_column', 'drop_materialized_view'],
    'no_tx': ['_commit', '_rollback', 'set_statement', '_set_transaction_option'],
    'no_misc': ['_truncate_statement', 'lock_table_statement', 'call_statement', 'drop_index'],
}
p = 'oracle/grammar/views_tx.js'
src = open(p).read()
starts = [(m.start(), m.group(1)) for m in re.finditer(r'\n  (\w+): ', src)]
blocks = {}
for i, (pos, name) in enumerate(starts):
    blocks[name] = (pos, starts[i + 1][0] if i + 1 < len(starts) else src.rindex('\n};'))
out = src
for n in sorted(GROUPS[sys.argv[1]], key=lambda n: -blocks[n][0]):
    a, b = blocks[n]
    out = out[:a] + out[b:]
open(p, 'w').write(out)
