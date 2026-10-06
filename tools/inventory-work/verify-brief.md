# Brief: verify a batch of inventory probes against vendor docs

You're verifying one batch of probes in the tree-sitter-sql-polyglot repo at
`/home/user/Tree-sitter-sql-polyglot`. The inventory (`tools/inventory/<dialect>.<part>.yml`) lists SQL
probes taken from vendor documentation. Some probes are `suspect` (our grammar accepts them and no
reference parser does) or `unconfirmed` (nobody accepts them). Your job is to decide, from the vendor
documentation, whether each assigned probe is real, valid syntax for that engine. You are not judging our grammar.

## Rules

- Never kill processes you did not start (no `pkill`/`killall`).
- You may edit only the part file named under each entry (to fix or drop a probe) and write your one
  verdict file under `tools/inventory-verify/`. No grammar files, no other inventory files, no
  `tools/inventory-results/`, no git commands that change anything. Scratch goes under
  `tools/inventory-work/scratch/<your task>/`.
- Do only the probes listed. Never change a probe to make our grammar accept it or reject it.
- Fetch each entry's `doc` page once (shared by all its probes). Prefer `curl` over WebFetch and print only the
  Syntax block and relevant examples, capped at a few thousand characters:

```bash
curl -sL --max-time 30 "$URL" | python3 -c 'import sys,html,re; t=sys.stdin.read(); t=re.sub(r"(?is)<(script|style).*?</\1>","",t); t=re.sub(r"<[^>]+>"," ",t); print(re.sub(r"\s+"," ",html.unescape(t)))' | head -c 20000
```

If a page is a JavaScript app, use the vendor's public docs repo via `raw.githubusercontent.com` (github.com
pages and API are blocked) or an official PDF. If a page is unreachable, mark its probes `doc-unreachable`
and don't guess.

## Verdicts

For each probe pick exactly one:

- `valid`: the doc's syntax block or examples support exactly this SQL. Leave the probe unchanged.
- `fixed`: the idea is real but the SQL is wrong (typo, wrong keyword order, missing clause). Edit the `sql:` in the
  part file to the corrected form and record the new SQL.
- `dropped`: the doc does not support this form (invented, wrong engine, removed in this version). Delete the probe
  from the part file. If that empties a statement's `probes:` list, leave a single basic-form probe if the doc has one.
- `doc-unreachable`: you could not read the page. Leave the probe unchanged.

Save as you go: create the verdict file early and update it after each entry, because a usage limit can cut you off.
If the verdict file exists when you start, resume and skip the probes already in it.

## Verdict file

`tools/inventory-verify/<task>.json`:

```json
{"task": "<task>", "verdicts": {"<entry key>/<probe id>": {"verdict": "valid|fixed|dropped|doc-unreachable", "note": "<one short line>", "sql": "<new sql, fixed only>"}}}
```

After editing part files, run `.venv-tools/bin/python tools/inventory.py --validate` once. Fix YAML errors you caused, then stop.

## What to return

Only this JSON, nothing else:

```json
{"task": "<task>", "valid": 0, "fixed": 0, "dropped": 0, "unreachable": 0}
```
