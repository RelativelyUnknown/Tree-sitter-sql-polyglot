## Summary

<!-- What does this change and why? -->

## Checklist

- [ ] Title follows [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`)
- [ ] Ran `npm run generate` (and `npm run test:keywords`) if a grammar file changed
- [ ] Added/updated corpus tests under `test/corpus/` or `<dialect>/test/corpus/`
- [ ] Breaking AST changes use a `!` and `BREAKING CHANGE` footer in the commit message
