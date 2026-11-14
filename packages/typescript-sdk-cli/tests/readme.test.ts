import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { before, after, describe, it } from 'node:test'

const repository = join(import.meta.dirname, '..', '..', '..')
const cliPackage = join(repository, 'packages', 'typescript-sdk-cli')
const workspace = mkdtempSync(join(tmpdir(), 'readme-'))

after(() => rmSync(workspace, { recursive: true, force: true }))

const runtimeName = '@bidirekt/typescript-sdk'
const cliName = '@bidirekt/typescript-sdk-cli'
const firstExamples = '\n## Quickstart\n'
const afterExamples = '\n## The `generate` command\n'
const exampleImports = {
  '@nestjs/common': '12.3.2',
  '@types/express': '5.0.6',
  '@types/node': '24.19.2',
  express: '5.3.0',
  'reflect-metadata': '0.2.2',
  rxjs: '7.8.2',
}
const compilerFlags = [
  '--strict',
  '--experimentalDecorators',
  '--module',
  'nodenext',
  '--types',
  'node',
  '--allowImportingTsExtensions',
  '--noEmit',
]

type CodeBlock = { heading: string; lang: string; file: string; body: string }

type OutputBlock = { lang: 'yaml' | 'text'; line: number; body: string }

type Group = { code: Array<CodeBlock>; outputs: Array<OutputBlock> }

type Example = {
  name: string
  files: Array<CodeBlock>
  yaml?: OutputBlock
  stderr?: OutputBlock
}

const npmCli = process.env.npm_execpath ?? ''
const tscBin = fileURLToPath(import.meta.resolve('typescript/bin/tsc'))

function npm(args: Array<string>, cwd: string): string {
  assert.ok(npmCli, 'run the tests with npm, which sets npm_execpath')
  return execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

function packedFile(args: Array<string>, cwd: string): string {
  const [packed] = JSON.parse(
    npm(
      [
        'pack',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        workspace,
        ...args,
      ],
      cwd,
    ),
  ) as Array<{ filename: string }>
  return `file:${join(workspace, packed.filename)}`
}

function readmeToGroups(readme: string): Array<Group> {
  const start = readme.indexOf(firstExamples)
  const end = readme.indexOf(afterExamples)
  assert.ok(start >= 0 && end > start, 'the README has its example sections')
  const startLine = readme.slice(0, start).split('\n').length
  const lines = readme.slice(start, end).split('\n')
  const groups: Array<Group> = []
  let current: Group = { code: [], outputs: [] }
  let heading = ''
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    const fence = /^(`{3,})(\w*)$/.exec(line)
    if (fence === null) {
      if (/^#{2,4} /.test(line)) {
        heading = line.replace(/^#+ /, '')
      }
      index++
      continue
    }
    const closing = lines.indexOf(fence[1], index + 1)
    assert.ok(
      closing > index,
      `the block at README line ${startLine + index} is closed`,
    )
    const body = lines.slice(index + 1, closing).join('\n') + '\n'
    const lang = fence[2]
    if (lang === 'ts' || lang === 'js') {
      const file = /^\/\/ (\S+)$/.exec(body.split('\n')[0] ?? '')?.[1]
      assert.ok(
        file !== undefined,
        `the ${lang} block at README line ${startLine + index} starts with "// <file>"`,
      )
      if (current.outputs.length > 0) {
        groups.push(current)
        current = { code: [], outputs: [] }
      }
      current.code.push({ heading, lang, file, body })
    }
    if (lang === 'yaml' || lang === 'text') {
      assert.ok(
        current.code.length > 0,
        `the ${lang} block at README line ${startLine + index} follows an example`,
      )
      current.outputs.push({ lang, line: startLine + index, body })
    }
    index = closing + 1
  }
  if (current.code.length > 0) {
    groups.push(current)
  }
  return groups
}

function groupToExamples(group: Group): Array<Example> {
  const yamls = group.outputs.filter((output) => output.lang === 'yaml')
  const texts = group.outputs.filter((output) => output.lang === 'text')
  assert.ok(
    group.outputs.length > 0,
    `the example under "${group.code[0].heading}" has an output`,
  )
  const location = `README line ${group.outputs[0].line}`
  assert.ok(
    yamls.length <= 1 && texts.length <= 1,
    `one yaml and one text at most at ${location}`,
  )
  const byHeading = Map.groupBy(group.code, (block) => block.heading)
  return [...byHeading.entries()].flatMap(([heading, blocks]) => {
    const byFile = Map.groupBy(blocks, (block) => block.file)
    const counts = new Set(
      [...byFile.values()]
        .map((each) => each.length)
        .filter((count) => count > 1),
    )
    assert.ok(
      counts.size <= 1,
      `files repeat as many times each under "${heading}"`,
    )
    const variants = [...counts][0] ?? 1
    return Array.from({ length: variants }, (_, variant) => ({
      name: `${heading} (${[...byFile.keys()].join(', ')}) #${variant + 1}, ${location}`,
      files: [...byFile.values()].map(
        (each) => each[Math.min(variant, each.length - 1)],
      ),
      yaml: yamls[0],
      stderr: texts[0],
    }))
  })
}

const readme = readFileSync(join(repository, 'README.md'), 'utf8')
const examples = readmeToGroups(readme).flatMap(groupToExamples)

describe('README examples', () => {
  const project = join(workspace, 'project')
  let cli = ''

  before(
    () => {
      const build = join(workspace, 'cli')
      // package.test.ts rebuilds the package's own dist while this file runs.
      execFileSync(process.execPath, [
        tscBin,
        '-p',
        join(cliPackage, 'tsconfig.build.json'),
        '--outDir',
        join(build, 'dist'),
      ])
      copyFileSync(
        join(cliPackage, 'package.json'),
        join(build, 'package.json'),
      )
      mkdirSync(project)
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
          private: true,
          type: 'module',
          dependencies: {
            [runtimeName]: packedFile(['--workspace', runtimeName], repository),
          },
          devDependencies: {
            [cliName]: packedFile([], build),
            ...exampleImports,
          },
        }),
      )
      npm(['install', '--no-audit', '--no-fund', '--prefer-offline'], project)
      const installed = join(project, 'node_modules', cliName)
      const manifest = JSON.parse(
        readFileSync(join(installed, 'package.json'), 'utf8'),
      ) as { bin: Record<string, string> }
      cli = join(installed, Object.values(manifest.bin)[0] ?? '')
      examples.forEach((example, index) => {
        const cwd = join(project, 'examples', String(index))
        for (const { file, body } of example.files) {
          mkdirSync(dirname(join(cwd, file)), { recursive: true })
          writeFileSync(join(cwd, file), body)
        }
      })
    },
    { timeout: 300_000 },
  )

  it('finds the examples', () => {
    assert.ok(examples.length > 0)
  })

  examples.forEach((example, index) => {
    it(example.name, () => {
      const cwd = join(project, 'examples', String(index))
      const result = spawnSync(process.execPath, [cli, 'generate'], {
        cwd,
        encoding: 'utf8',
      })

      const generated = join(cwd, 'contracts', 'generated.yaml')
      assert.equal(result.stderr, example.stderr?.body ?? '', 'stderr')
      if (example.yaml === undefined) {
        assert.equal(result.status, 1, 'exit code')
        assert.equal(existsSync(generated), false, 'nothing is written')
        return
      }
      assert.equal(result.status, 0, 'exit code')
      assert.equal(readFileSync(generated, 'utf8'), example.yaml.body, 'output')
    })

    const sources = example.files.filter((block) => block.lang === 'ts')
    if (sources.length === 0) {
      return
    }
    it(`${example.name} compiles`, () => {
      const cwd = join(project, 'examples', String(index))
      const compiled = spawnSync(
        process.execPath,
        [tscBin, ...compilerFlags, ...sources.map((block) => block.file)],
        { cwd, encoding: 'utf8' },
      )

      const showsSyntaxError =
        example.stderr?.body.includes(' syntax error: ') ?? false
      if (showsSyntaxError) {
        assert.notEqual(compiled.status, 0, 'tsc rejects the syntax error')
        return
      }
      assert.equal(compiled.stdout, '', 'tsc output')
      assert.equal(compiled.status, 0, 'tsc exit code')
    })
  })
})
