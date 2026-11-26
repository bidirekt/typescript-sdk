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
  BidirektField,
  BidirektGraph,
  BidirektGraphqlConsumer,
  BidirektGraphqlField,
  BidirektRestConsumer,
  BidirektRestProvider,
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

@BidirektSchema({ union: { card: CardPayment, pix: PixPayment } })
class Payment {
  @BidirektField({ type: 'integer' })
  amount!: number
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

  @BidirektGraphqlField({ scalar: 'DateTime', arguments: PixPayment })
  bornAt!: string

  internalNotes = ''
}

class PetsController {
  @BidirektRestProvider({ method: 'GET', path: '/pets/*', responses: { 200: Pet, 404: null } })
  find(): string {
    return 'found'
  }

  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list(): string {
    return 'listed'
  }

  @BidirektRestProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured(): string {
    return 'featured'
  }

  @BidirektRestConsumer({
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

@BidirektGraph('petstore_graph')
class PetstoreClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', arguments: PixPayment, returns: { nullable: Pet } })
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'petCount', returns: 'integer' })
  pet(): string {
    return 'queried'
  }

  @BidirektGraphqlConsumer({ provider: 'petstore_api', mutation: 'adoptPet', returns: [Pet] })
  adopt(): string {
    return 'adopted'
  }
}

const controller = new PetsController()
const client = new PetstoreClient()
const pet = new Pet()
console.log(
  JSON.stringify({
    handlers: [
      controller.find(),
      controller.list(),
      controller.featured(),
      controller.charge(),
      client.pet(),
      client.adopt(),
    ],
    pet: Object.keys(pet),
  }),
)
`

const expectedOutput = `${JSON.stringify({
  handlers: ['found', 'listed', 'featured', 'charged', 'queried', 'adopted'],
  pet: [
    'id',
    'birthDate',
    'nickname',
    'payment',
    'scores',
    'bornAt',
    'internalNotes',
  ],
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
  test('exports only the decorators and their option types', () => {
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
      'BidirektField',
      'BidirektFieldOptions',
      'BidirektFieldType',
      'BidirektGraph',
      'BidirektGraphqlConsumer',
      'BidirektGraphqlConsumerOptions',
      'BidirektGraphqlField',
      'BidirektGraphqlFieldOptions',
      'BidirektRestConsumer',
      'BidirektRestConsumerOptions',
      'BidirektRestHttpMethod',
      'BidirektRestProvider',
      'BidirektRestProviderOptions',
      'BidirektSchema',
      'BidirektSchemaOptions',
    ])
  })
})

describe('GraphQL consumer options', () => {
  const entry = join(runtimePackageRoot, 'src', 'index.ts')
  const cases: Record<string, Array<string>> = {
    'every-returns-form': [
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', arguments: Pet, returns: Pet })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pets', returns: [Pet] })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'maybePet', returns: { nullable: Pet, name: 'MaybePet' } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pages', returns: { list: Pet, nullable: true, nullableItems: true, name: 'Pages' } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'petCount', returns: 'integer' })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'tags', returns: 'string[]' })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'now', returns: { scalar: 'DateTime' } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'dates', returns: { list: { scalar: 'DateTime' }, nullableItems: true } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'status', returns: { enum: ['AVAILABLE', 'SOLD'], name: 'Status' } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'match', returns: { union: { Pet: Pet }, name: 'SearchResult' } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'search', returns: { list: { union: { Pet: Pet }, name: 'SearchResult' } } })",
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', mutation: 'deletePet', returns: { nullable: 'boolean' } })",
    ],
    'query-and-mutation': [
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', mutation: 'adoptPet', returns: Pet })",
    ],
    'rest-option': [
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', method: 'GET', returns: Pet })",
    ],
    'enum-without-name': [
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'status', returns: { enum: ['AVAILABLE'] } })",
    ],
    'union-without-name': [
      "@BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'search', returns: { union: { Pet: Pet } } })",
    ],
  }
  let optionsRoot = ''
  let errors = new Map<string, Array<string>>()

  before(async () => {
    optionsRoot = await mkdtemp(join(tmpdir(), 'bidirekt-sdk-options-'))
    const files: Array<string> = []
    for (const [name, decorators] of Object.entries(cases)) {
      const file = join(optionsRoot, `${name}.ts`)
      files.push(file)
      await writeFile(
        file,
        [
          `import { BidirektGraphqlConsumer, BidirektSchema } from ${JSON.stringify(entry)}`,
          '',
          '@BidirektSchema()',
          'export class Pet {}',
          '',
          'export class PetstoreClient {',
          ...decorators.map((decorator) => `  ${decorator}`),
          '  call(): void {}',
          '}',
          '',
        ].join('\n'),
      )
    }
    const program = ts.createProgram(files, {
      strict: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      target: ts.ScriptTarget.ES2024,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    })
    errors = new Map(
      files.map((file) => [
        file.slice(optionsRoot.length + 1, -'.ts'.length),
        ts
          .getPreEmitDiagnostics(program, program.getSourceFile(file))
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
          ),
      ]),
    )
  })

  after(async () => {
    await rm(optionsRoot, { recursive: true, force: true })
  })

  test('compiles on a method with every returns form', () => {
    assert.deepEqual(errors.get('every-returns-form'), [])
  })

  test('does not compile with both query and mutation', () => {
    assert.match(
      errors.get('query-and-mutation')?.join('\n') ?? '',
      /'string' is not assignable to type 'undefined'/,
    )
  })

  test('does not compile with a REST option', () => {
    assert.match(
      errors.get('rest-option')?.join('\n') ?? '',
      /'method' does not exist/,
    )
  })

  test('does not compile with an enum without a name', () => {
    assert.match(
      errors.get('enum-without-name')?.join('\n') ?? '',
      /'{ enum: string\[\]; }' is not assignable to type 'BidirektGraphqlReturns'/,
    )
  })

  test('does not compile with a union without a name', () => {
    assert.match(
      errors.get('union-without-name')?.join('\n') ?? '',
      /'{ union: { Pet: typeof Pet; }; }' is not assignable to type 'BidirektGraphqlReturns'/,
    )
  })
})

function tsconfigSuffix(mode: { experimentalDecorators: boolean }): string {
  if (mode.experimentalDecorators) {
    return 'legacy'
  }
  return 'tc39'
}
