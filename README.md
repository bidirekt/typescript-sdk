# Bidirekt TypeScript SDK

[![CI](https://img.shields.io/github/actions/workflow/status/bidirekt/typescript-sdk/ci.yml?branch=main&label=CI)](https://github.com/bidirekt/typescript-sdk/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/bidirekt/typescript-sdk)](LICENSE)

In Bidirekt, each side of an integration declares in a contract file what it provides and what it consumes. This SDK writes that file from TypeScript and JavaScript code: you annotate the schemas and the handlers that provide or consume each resource, run `generate`, and get `contracts/generated.yaml`, ready for `bidirekt validate` and `bidirekt publish`. It comes in two packages: `@bidirekt/typescript-sdk`, the decorators your code imports, and `@bidirekt/typescript-sdk-cli`, the `generate` command.

## Development

Read [CONTRIBUTING.md](CONTRIBUTING.md). The two packages live in `packages/` as npm workspaces. With Node.js 24, the version CI uses, install the dependencies and run the checks from the repository root before you open a pull request:

```sh
npm ci
npm run check
npm run lint
npm run typecheck
npm test
```

## License

MIT, see [LICENSE](LICENSE).
