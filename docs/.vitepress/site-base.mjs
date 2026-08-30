// The GitHub Pages base path. Must match the repo's Pages URL
// (https://<owner>.github.io/<repo>/). scripts/docs-prep.js deliberately
// does NOT use this: root-relative markdown links (e.g. /artifacts/foo) are
// rewritten with `base` by VitePress itself at build time, so prefixing
// them here too would double it up.
export const SITE_BASE = '/Tree-sitter-sql-polyglot/';
