# Brief: list one dialect's statements (small task, keep it short)

Repo: `/home/user/Tree-sitter-sql-polyglot`. Fetch the vendor's SQL statement index for the dialect
in your assignment and write a JSON list of its statements. Nothing else: don't read statement
pages, don't write probes, don't touch the repo.

1. Fetch the index page(s) named in the assignment with curl and pull out the statement names and
   links (`curl -sL --max-time 30 URL > page.html`, then a short python/grep extraction; never print
   a whole page). If the portal is JavaScript-only, use the vendor's public docs repo via
   raw.githubusercontent.com, a content API, or the PDFs named in the assignment.
2. Skip statements that already have an entry: list existing ids with
   `grep -h '^  - id:' tools/inventory/<dialect>*.yml 2>/dev/null` and drop matching statements
   (same statement under a slightly different id counts as a match).
3. Give each remaining statement a tier: high = queries, DML, CREATE/ALTER/DROP TABLE/VIEW/INDEX/
   FUNCTION/PROCEDURE, transactions, procedural blocks; medium = schemas/databases, sequences,
   grants/roles, EXPLAIN, SHOW/DESCRIBE, session SET, load/unload, triggers, common maintenance;
   low = DBA/cluster admin, replication, rare or legacy.
4. Write `tools/inventory-work/index/<dialect>.json`:
   `{"dialect": "...", "engine": "...", "version": "...", "source": "<index URL>",
     "expressions_done": <true if an existing part already has an `expressions:` section>,
     "statements": [{"id": "snake_case", "name": "CREATE TABLE", "url": "...", "tier": "high"}]}`

Return only: `{"file": "<path>", "statements": N, "high": N, "medium": N, "low": N}`
