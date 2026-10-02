import assert from "node:assert";
import { test } from "node:test";
import Parser from "tree-sitter";
import { postgres } from "./index.js";

test("can load postgres grammar", () => {
  const parser = new Parser();
  assert.doesNotReject(async () => parser.setLanguage(postgres.language));
});

test("postgres highlights query compiles", () => {
  assert.ok(postgres.HIGHLIGHTS_QUERY, "postgres.HIGHLIGHTS_QUERY is missing");
  new Parser.Query(postgres.language, postgres.HIGHLIGHTS_QUERY);
});
