"""Throwaway: shadow field()/alias() with pass-throughs in every grammar file Oracle loads."""
import re, sys, pathlib
variant = sys.argv[1]
shadow = []
if variant in ("nofields", "both"):
    shadow.append("const field = (_n, r) => r;")
if variant in ("noalias", "both"):
    shadow.append("const alias = (r, _n) => r;")
if not shadow:
    sys.exit(0)
files = [pathlib.Path("grammar.js")] + list(pathlib.Path("grammar").rglob("*.js")) \
      + [pathlib.Path("oracle/grammar.js")] + list(pathlib.Path("oracle/grammar").rglob("*.js"))
for f in files:
    src = f.read_text()
    lines = src.split("\n")
    last = max((i for i, l in enumerate(lines) if re.match(r"\s*(import .* from |} from )", l)), default=-1)
    # multi-line imports end at the line containing "from '...';"
    lines.insert(last + 1, "\n".join(shadow))
    f.write_text("\n".join(lines))
print("patched", len(files), "files for", variant)
