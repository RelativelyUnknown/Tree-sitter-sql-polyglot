#!/usr/bin/env bash
# Build the grammars-v4 SQL parsers used by the ANTLR corroborator in
# tools/coverage.py. Each built grammar lands in tools/antlr/build/<key>/ with a
# `meta` file recording the TestRig grammar name and start rule. Grammars that
# fail to generate/compile are skipped (the corroborator reports them as
# unsupported) so a partial toolchain still yields a working subset.
#
# Requires: a JDK (java + javac) and curl.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANTLR_VERSION="4.13.2"
# Pin grammars-v4 so probes are judged against a fixed reference, not a moving one.
GRAMMARS_REF="e756f2a2ee5565a9300666f100ba6acd874664f7"
JAR="$HERE/antlr-${ANTLR_VERSION}-complete.jar"
SRC="$HERE/grammars-v4"
BUILD="$HERE/build"

# key|relative grammar dir|.g4 files (space-sep)|TestRig name|start rule
# Only grammars without external *Base helper classes are listed, so they
# generate + compile standalone.
MANIFEST=(
  "sql_sqlite|sql/sqlite|SQLiteLexer.g4 SQLiteParser.g4|SQLite|parse"
  "sql_mysql|sql/mysql/Positive-Technologies|MySqlLexer.g4 MySqlParser.g4|MySql|sqlStatements"
  "sql_tsql|sql/tsql|TSqlLexer.g4 TSqlParser.g4|TSql|tsql_file"
)

command -v java >/dev/null && command -v javac >/dev/null || {
  echo "ERROR: JDK (java/javac) not found." >&2; exit 2; }

mkdir -p "$BUILD"

if [ ! -f "$JAR" ]; then
  echo "Fetching ANTLR ${ANTLR_VERSION}…"
  # Maven Central (antlr.org is often blocked by egress policies).
  curl -fsSL "https://repo1.maven.org/maven2/org/antlr/antlr4/${ANTLR_VERSION}/antlr4-${ANTLR_VERSION}-complete.jar" -o "$JAR" || {
    echo "ERROR: failed to download ANTLR jar." >&2; exit 2; }
fi

if [ ! -d "$SRC/.git" ]; then
  echo "Cloning grammars-v4…"
  rm -rf "$SRC"
  git clone --quiet https://github.com/antlr/grammars-v4.git "$SRC" || {
    echo "ERROR: failed to clone grammars-v4." >&2; exit 2; }
fi
echo "Checking out grammars-v4 @ ${GRAMMARS_REF}…"
git -C "$SRC" checkout --quiet "$GRAMMARS_REF" || {
  echo "ERROR: failed to checkout pinned grammars-v4 ref." >&2; exit 2; }

built=0
for row in "${MANIFEST[@]}"; do
  IFS='|' read -r key rel files name start <<<"$row"
  gdir="$SRC/$rel"
  out="$BUILD/$key"
  echo "── $key ($rel)"
  if [ ! -d "$gdir" ]; then echo "   skip: $rel not found"; continue; fi
  rm -rf "$out"; mkdir -p "$out"
  ( cd "$gdir" && java -jar "$JAR" -Dlanguage=Java -o "$out" $files ) >/dev/null 2>&1 || {
    echo "   skip: antlr generate failed"; rm -rf "$out"; continue; }
  ( cd "$out" && javac -cp "$JAR" ./*.java ) >/dev/null 2>&1 || {
    echo "   skip: javac failed"; rm -rf "$out"; continue; }
  printf 'name=%s\nstart=%s\n' "$name" "$start" > "$out/meta"
  echo "   ok"
  built=$((built + 1))
done

echo "Built $built grammar(s) into $BUILD"
[ "$built" -gt 0 ]
