#!/usr/bin/env python3
"""
Print a dialect's resolved grammar as compact EBNF.

A dialect's grammar.js only lists what it overrides; everything else comes
from its parent chain. `<dialect>/src/grammar.json` (written by
`tree-sitter generate`) is the fully resolved grammar, so this reads that and
prints one line per rule, with keyword tokens shown as their SQL word:

    create_table := CREATE [(_temporary | UNLOGGED)] TABLE [_if_not_exists] object_reference ...

`[x]` is optional, `(a | b)` a choice, `{x}` zero or more, `{x}+` one or more.

    python tools/grammar_outline.py postgres            # whole grammar
    python tools/grammar_outline.py postgres create_    # rules whose name contains create_
    python tools/grammar_outline.py postgres --tests    # corpus test names only
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def grammar_dir(dialect: str) -> Path:
    return ROOT if dialect in ("base", "sql", ".") else ROOT / dialect


def render(n: dict) -> str:
    t = n["type"]
    if t == "SYMBOL":
        name = n["name"]
        return name[len("keyword_"):].upper() if name.startswith("keyword_") else name
    if t == "STRING":
        return repr(n["value"])
    if t == "PATTERN":
        return "/" + n["value"] + "/" if len(n["value"]) < 40 else "/…/"
    if t == "BLANK":
        return "ε"
    if t == "SEQ":
        return " ".join(render(m) for m in n["members"])
    if t == "CHOICE":
        ms = n["members"]
        if len(ms) == 2 and ms[1]["type"] == "BLANK":
            return "[" + render(ms[0]) + "]"
        return "(" + " | ".join(render(m) for m in ms) + ")"
    if t == "REPEAT":
        return "{" + render(n["content"]) + "}"
    if t == "REPEAT1":
        return "{" + render(n["content"]) + "}+"
    if "content" in n:
        return render(n["content"])
    return t


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__.strip())
        return 2
    d = grammar_dir(args[0])
    if "--tests" in sys.argv:
        for f in sorted((d / "test" / "corpus").glob("*.txt")):
            names = re.findall(r"^=+\n(.+)\n=+\n", f.read_text(), re.M)
            print(f"{f.name}: " + "; ".join(n.strip() for n in names))
        return 0
    gj = d / "src" / "grammar.json"
    if not gj.exists():
        print(f"{gj} not found; run `tree-sitter generate --no-parser` in {d}", file=sys.stderr)
        return 2
    rules = json.loads(gj.read_text())["rules"]
    pat = args[1] if len(args) > 1 else None
    for name, rule in rules.items():
        if name.startswith("keyword_") or (pat and pat not in name):
            continue
        print(f"{name} := {render(rule)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
