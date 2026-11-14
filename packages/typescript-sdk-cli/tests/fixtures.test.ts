import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { runCommand } from '../src/command.ts'

const fixtures = join(import.meta.dirname, 'fixtures')
const workspace = mkdtempSync(join(tmpdir(), 'fixtures-'))

after(() => rmSync(workspace, { recursive: true, force: true }))

function readIfExists(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined
  }
  return readFileSync(path, 'utf8')
}

function caseArguments(caseDirectory: string): Array<string> {
  const args = readIfExists(join(caseDirectory, 'args.txt')) ?? ''
  return args.split(/\s+/).filter((arg) => arg !== '')
}

function filesUnder(directory: string): Map<string, string> {
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  })
  return new Map(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const path = join(entry.parentPath, entry.name)
        return [path.slice(directory.length + 1), readFileSync(path, 'utf8')]
      }),
  )
}

function runEntry(cwd: string, entry: string): void {
  const run = spawnSync(process.execPath, [entry], { cwd, encoding: 'utf8' })
  assert.equal(run.status, 0, `node ${entry} exits 0: ${run.stderr}`)
}

const cases = readdirSync(fixtures, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

describe('fixtures', () => {
  for (const name of cases) {
    it(name, () => {
      const caseDirectory = join(fixtures, name)
      const expectedYaml = readIfExists(join(caseDirectory, 'expected.yaml'))
      const expectedError = readIfExists(
        join(caseDirectory, 'expected-error.txt'),
      )
      const expectedStderr = readIfExists(
        join(caseDirectory, 'expected-stderr.txt'),
      )
      assert.ok(
        (expectedYaml === undefined) !== (expectedError === undefined),
        'a case has exactly one of expected.yaml and expected-error.txt',
      )
      assert.ok(
        expectedError === undefined || expectedStderr === undefined,
        'expected-stderr.txt only goes with expected.yaml',
      )
      const cwd = join(workspace, name)
      cpSync(caseDirectory, cwd, { recursive: true })
      const before = filesUnder(cwd)

      const result = runCommand(['generate', ...caseArguments(cwd)], cwd)

      if (expectedError !== undefined) {
        assert.equal(result.stderr, expectedError, 'stderr')
        assert.equal(result.exitCode, 1, 'exit code')
        assert.deepEqual(filesUnder(cwd), before, 'nothing is written')
        return
      }
      assert.equal(result.stderr, expectedStderr ?? '', 'stderr')
      assert.equal(result.exitCode, 0, 'exit code')
      assert.equal(
        readFileSync(join(cwd, 'contracts', 'generated.yaml'), 'utf8'),
        expectedYaml,
        'output',
      )
      const entry = readIfExists(join(cwd, 'run.txt'))?.trim()
      if (entry !== undefined) {
        runEntry(cwd, entry)
      }
    })
  }
})
