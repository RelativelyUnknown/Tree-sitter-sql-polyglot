#!/usr/bin/env bash
# ANTLR corroborator runner. Reads SQL on stdin, parses it with a grammars-v4
# grammar built by setup.sh, and exits 0 iff there are no syntax errors.
#
# Usage: echo "SELECT 1;" | bash tools/antlr/run.sh sql/sqlite
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANTLR_VERSION="4.13.2"
JAR="$HERE/antlr-${ANTLR_VERSION}-complete.jar"

g="${1:?usage: run.sh <grammar-key e.g. sql/sqlite>}"
key="${g//\//_}"
out="$HERE/build/$key"
[ -d "$out" ] && [ -f "$out/meta" ] || { echo "grammar not built: $key" >&2; exit 2; }

# shellcheck disable=SC1090
name="$(sed -n 's/^name=//p' "$out/meta")"
start="$(sed -n 's/^start=//p' "$out/meta")"

# TestRig prints "line L:C ..." syntax errors to stderr and always exits 0, so
# treat any such line as a parse failure.
errs="$(java -cp "$JAR:$out" org.antlr.v4.gui.TestRig "$name" "$start" 2>&1 >/dev/null)"
if printf '%s' "$errs" | grep -qE '^line [0-9]+:[0-9]+'; then
  exit 1
fi
exit 0
