# Fixtures

Each folder is one case of `generate`, run by `tests/fixtures.test.ts`. Adding a case is adding a folder.

The runner copies the folder to a temporary directory and runs `generate` there, with that directory as the cwd, so nothing is written into the repository.

A case holds:

- The annotated project: code with its own `tsconfig.json`, its own `jsconfig.json`, or no config at all. `@bidirekt/typescript-sdk` resolves to the runtime package the CLI depends on, `packages/typescript-sdk` of this repository, which `npm test` builds first; no install needed.
- Exactly one expected result:
  - `expected.yaml`: `generate` exits 0 and `contracts/generated.yaml` equals this one byte by byte. stderr equals `expected-stderr.txt` when the case has one (warnings), and is empty otherwise.
    Every `expected.yaml` must be a contract broker 0.2.1 accepts: the `e2e` job publishes each one.
  - `expected-error.txt`: `generate` exits 1, stderr equals this file byte by byte, and no file in the case changes.
- `run.txt` (optional, success cases only): the entry file the case runs with `node <entry>` after `generate`, asserting exit 0. It proves the annotated project runs with Node type stripping.
- `args.txt` (optional): the flags passed after `generate`, separated by whitespace, e.g. `--check`. The result is always read from `contracts/generated.yaml` of the case folder.

For `--check`, commit the `contracts/generated.yaml` the check reads inside the case: up to date pairs it with an identical `expected.yaml`, out of date with an `expected-error.txt`.
