"""Removes one group of dispatch-list entries from the oracle grammar in the CI checkout only
(throwaway experiment). Unreferenced rules are pruned by tree-sitter, so this measures what a
group costs in states and in the u16 action index."""
import glob, re, sys

GROUPS = {
    'baseline': [],
    'no_tablespace': ['create_tablespace', 'alter_tablespace', 'drop_tablespace'],
    'no_profile': ['create_profile', 'alter_profile', 'drop_profile'],
    'no_domain': ['create_domain_statement', 'alter_domain_statement', 'drop_domain_statement'],
    'no_grant': ['grant_statement', 'revoke_statement'],
    'no_graph_vector': ['create_property_graph_statement', 'create_vector_index_statement',
                        'alter_duality_view_statement', 'alter_property_graph_statement',
                        'drop_property_graph_statement', 'create_hybrid_vector_index_statement'],
    'no_units': ['alter_function_statement', 'alter_procedure_statement', 'drop_trigger_statement',
                 'create_type_body_statement', 'alter_synonym_statement', 'alter_package_statement',
                 'alter_trigger_statement'],
    'no_type': ['create_type', 'alter_type'],
    'no_session': ['alter_session_statement', 'alter_system_statement'],
    'no_json': ['json_function', 'json_constructor', 'is_json_condition', 'json_object_access'],
    'no_views': ['create_view', 'create_materialized_view', 'alter_view', 'drop_view', 'drop_materialized_view'],
    'no_mvlog': ['create_materialized_view_log', 'alter_materialized_view_log', 'drop_materialized_view_log'],
    'no_trigger': ['create_trigger'],
    'no_json_function': ['json_function'],
    'no_json_constructor': ['json_constructor'],
    'no_is_json': ['is_json_condition'],
    'no_json_access': ['json_object_access'],
    'no_json_table': ['json_table'],
    'no_dml': ['multi_table_insert', 'lock_table_statement', 'purge_statement', 'flashback_statement'],
}
names = GROUPS[sys.argv[1]]
removed = 0
for path in glob.glob('oracle/grammar.js') + glob.glob('oracle/grammar/*.js'):
    text = open(path).read()
    out = text
    for n in names:
        out, k = re.subn(r'(?m)^[ \t]*\$\.%s,[ \t]*\n' % re.escape(n), '', out)
        removed += k
    if out != text:
        open(path, 'w').write(out)
print('removed', removed, 'list entries for', sys.argv[1])
