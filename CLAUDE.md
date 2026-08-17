## Sui Development Skills

Install community-maintained skills for Sui development:

```sh
npx skills https://github.com/MystenLabs/skills
```

## Sui SDK Reference

Every `@mysten/*` package ships LLM documentation in its `docs/` directory. When working with these packages, find the relevant docs by looking for `docs/llms-index.md` files inside `node_modules/@mysten/*/`. Read the index first to find the page you need, then read that page for details.

## Project Structure

- `src/` — `@misofm/link` TypeScript client extension and transaction builders.
- `test/` — unit tests and the environment-gated testnet lifecycle test.

## Project Rules

- A resolution is the namespace owner's assertion, never a registration with an identifier standards body.
- Never hardcode `link.miso.sui`; the bridge parent domain and SuiNS deployment configuration are caller/config supplied.
- Reassignment must remain remove-then-create in one atomic PTB.
- Treat all `@mysten/*` packages as npm peer dependencies and verify APIs against installed package docs/source.

## Official Resources

When unsure about Sui APIs, consult these sources. Do not guess or extrapolate from other blockchains.

- Sui documentation MCP server: `https://sui.mcp.kapa.ai`
- Move Book: https://move-book.com (use https://move-book.com/llms.txt)
- Sui Docs: https://docs.sui.io (use https://docs.sui.io/llms.txt)
- Sui Move examples: https://github.com/MystenLabs/sui/tree/main/examples/move
