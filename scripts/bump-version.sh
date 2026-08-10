#!/bin/bash
# Bump version across all manifests in one shot.
# Usage: bash scripts/bump-version.sh <version>
# Example: bash scripts/bump-version.sh 0.4.0

VERSION=$1
if [[ -z "$VERSION" ]]; then
  echo "Usage: bash scripts/bump-version.sh <version>"
  exit 1
fi

# package.json and tree-sitter.json (root + every dialect).
# Glob all dialect tree-sitter.json files so new dialects are covered automatically.
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" tree-sitter.json
for ts in */tree-sitter.json; do
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ts"
done

# Cargo.toml (first occurrence; the [package] version)
sed -i "0,/^version = .*/s/^version = .*/version = \"$VERSION\"/" Cargo.toml

# pyproject.toml
sed -i "s/^version = .*/version = \"$VERSION\"/" pyproject.toml

# CMakeLists.txt
sed -i "s/set(PROJECT_VERSION [^)]*)/set(PROJECT_VERSION $VERSION)/" CMakeLists.txt

echo "Bumped all manifests to $VERSION"
echo ""
echo "Verify with:"
echo "  grep -n 'version' package.json tree-sitter.json Cargo.toml pyproject.toml CMakeLists.txt"
