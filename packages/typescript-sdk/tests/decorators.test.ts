import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import ts from 'typescript'

const run = promisify(execFile)

const runtimePackageRoot = fileURLToPath(new URL('..', import.meta.url))
const tscBin = fileURLToPath(import.meta.resolve('typescript/bin/tsc'))
const tsxBin = fileURLToPath(import.meta.resolve('tsx/cli'))
const typesRoot = dirname(
  dirname(fileURLToPath(import.meta.resolve('@types/node/package.json'))),
)

const sampleSource = `import {
  BidirektConsumer,
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
class CardPayment {
  @BidirektField({ type: 'string' })
  last4!: string
}

@BidirektSchema({ name: 'Pix' })
class PixPayment {
  @BidirektField()
  key!: string
}

@BidirektSchema()
class Pet {
  @BidirektField({ type: 'integer' })
  id!: number

  @BidirektField({ name: 'birth_date', nullable: true })
  birthDate!: string | null

  @BidirektField({ description: 'Shown on the card', optional: true })
  nickname?: string

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  payment!: CardPayment | PixPayment

  @BidirektField({ type: 'map<integer[]>' })
  scores: Record<string, number[]> = {}

  internalNotes = ''
}

class PetsController {
  @BidirektProvider({ method: 'GET', path: '/pets/*', responses: { 200: Pet, 404: null } })
  find(): string {
    return 'found'
  }

  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list(): string {
    return 'listed'
  }

  @BidirektProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured(): string {
    return 'featured'
  }

  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: null,
    responses: { 201: CardPayment, 402: null },
  })
  charge(): string {
    return 'charged'
  }
}

const controller = new PetsController()
const pet = new Pet()
console.log(
  JSON.stringify({
    handlers: [
      controller.find(),
      controller.list(),
      controller.featured(),
      controller.charge(),
    ],
    pet: Object.keys(pet),
  }),
)
`

const expectedOutput = `${JSON.stringify({
  handlers: ['found', 'listed', 'featured', 'charged'],
  pet: ['id', 'birthDate', 'nickname', 'payment', 'scores', 'internalNotes'],
})}\n`

const decoratorModes = [
  {
    name: 'legacy experimentalDecorators',
    experimentalDecorators: true,
    tscHelper: '__decorate(',
    esbuildHelper: '__decorateClass(',
  },
  {
    name: 'TC39',
    experimentalDecorators: false,
    tscHelper: '__esDecorate(',
    esbuildHelper: '__decorateElement(',
  },
]

describe('decorators at runtime', () => {
  let sampleRoot = ''

  before(async () => {
    sampleRoot = await mkdtemp(join(tmpdir(), 'bidirekt-sdk-runtime-'))
    const packageRoot = join(
      sampleRoot,
      'node_modules/@bidirekt/typescript-sdk',
    )
    await mkdir(packageRoot, { recursive: true })
    await copyFile(
      join(runtimePackageRoot, 'package.json'),
      join(packageRoot, 'package.json'),
    )
    await run(process.execPath, [
      tscBin,
      '-p',
      join(runtimePackageRoot, 'tsconfig.build.json'),
      '--outDir',
      join(packageRoot, 'dist'),
    ])
    await writeFile(
      join(sampleRoot, 'package.json'),
      JSON.stringify({ type: 'module' }),
    )
    await writeFile(join(sampleRoot, 'sample.ts'), sampleSource)
    for (const mode of decoratorModes) {
      await writeFile(
        join(sampleRoot, `tsconfig.${tsconfigSuffix(mode)}.json`),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            module: 'nodenext',
            moduleResolution: 'nodenext',
            target: 'es2024',
            lib: ['es2024'],
            types: ['node'],
            typeRoots: [typesRoot],
            experimentalDecorators: mode.experimentalDecorators,
            rootDir: '.',
            outDir: `out-${tsconfigSuffix(mode)}`,
          },
          files: ['sample.ts'],
        }),
      )
    }
  })

  after(async () => {
    await rm(sampleRoot, { recursive: true, force: true })
  })

  for (const mode of decoratorModes) {
    test(`compiles with tsc and runs with node (${mode.name})`, async () => {
      const suffix = tsconfigSuffix(mode)
      await run(process.execPath, [
        tscBin,
        '-p',
        join(sampleRoot, `tsconfig.${suffix}.json`),
      ])
      const compiled = join(sampleRoot, `out-${suffix}`, 'sample.js')
      assert.ok((await readFile(compiled, 'utf8')).includes(mode.tscHelper))
      const { stdout } = await run(process.execPath, [compiled])
      assert.equal(stdout, expectedOutput)
    })

    test(`runs with tsx (${mode.name})`, async () => {
      const { stdout } = await run(
        process.execPath,
        [
          tsxBin,
          '--tsconfig',
          `tsconfig.${tsconfigSuffix(mode)}.json`,
          'sample.ts',
        ],
        { cwd: sampleRoot },
      )
      assert.equal(stdout, expectedOutput)
    })

    test(`bundles with esbuild and runs with node (${mode.name})`, async () => {
      const suffix = tsconfigSuffix(mode)
      const bundle = join(sampleRoot, `bundle-${suffix}.js`)
      await build({
        absWorkingDir: sampleRoot,
        entryPoints: ['sample.ts'],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node22',
        tsconfig: `tsconfig.${suffix}.json`,
        outfile: bundle,
        logLevel: 'silent',
      })
      assert.ok((await readFile(bundle, 'utf8')).includes(mode.esbuildHelper))
      const { stdout } = await run(process.execPath, [bundle])
      assert.equal(stdout, expectedOutput)
    })
  }
})

describe('public API', () => {
  test('exports only the four decorators and their option types', () => {
    const entry = join(runtimePackageRoot, 'src', 'index.ts')
    const program = ts.createProgram([entry], {
      allowImportingTsExtensions: true,
      noEmit: true,
    })
    const source = program.getSourceFile(entry)
    assert.ok(source, 'the entry is in the program')
    const checker = program.getTypeChecker()
    const entryModule = checker.getSymbolAtLocation(source)
    assert.ok(entryModule, 'the entry is a module')

    const exported = checker
      .getExportsOfModule(entryModule)
      .map((symbol) => symbol.name)
      .sort()

    assert.deepEqual(exported, [
      'BidirektBody',
      'BidirektConsumer',
      'BidirektConsumerOptions',
      'BidirektField',
      'BidirektFieldOptions',
      'BidirektFieldType',
      'BidirektHttpMethod',
      'BidirektProvider',
      'BidirektProviderOptions',
      'BidirektSchema',
      'BidirektSchemaOptions',
    ])
  })
})

function tsconfigSuffix(mode: { experimentalDecorators: boolean }): string {
  if (mode.experimentalDecorators) {
    return 'legacy'
  }
  return 'tc39'
}
