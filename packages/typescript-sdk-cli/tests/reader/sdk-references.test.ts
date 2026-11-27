import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import * as runtime from '@bidirekt/typescript-sdk'
import { defaultProtocols } from '../../src/protocols.ts'
import type { ProtocolModule } from '../../src/protocols.ts'
import { projectToProgram } from '../../src/reader/program.ts'
import {
  programToSdkReferences,
  protocolsToDecoratorTargets,
} from '../../src/reader/sdk-references.ts'

const root = mkdtempSync(join(tmpdir(), 'reader-references-'))

after(() => rmSync(root, { recursive: true, force: true }))

function referencesOf(
  name: string,
  files: Record<string, string>,
  protocols: ReadonlyArray<ProtocolModule> = defaultProtocols,
) {
  const directory = join(root, name)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), content)
  }
  const projectProgram = projectToProgram({ directory })
  if ('message' in projectProgram) {
    assert.fail(`unexpected diagnostic: ${projectProgram.message}`)
  }
  return programToSdkReferences(projectProgram, protocols).map((reference) => ({
    name: reference.name,
    file: reference.location.file.slice(directory.length + 1),
    line: reference.location.line,
    use: reference.use,
  }))
}

describe('programToSdkReferences', () => {
  it('names exactly the exports of the runtime with the registered protocols', () => {
    const names = [...protocolsToDecoratorTargets(defaultProtocols).keys()]

    assert.deepEqual(names.sort(), Object.keys(runtime).sort())
  })

  it('recognizes a named import used as a decorator', () => {
    const references = referencesOf('named', {
      'pet.ts': [
        "import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'",
        '',
        '@BidirektSchema()',
        'export class Pet {',
        '  @BidirektField()',
        '  name!: string',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektSchema',
        file: 'pet.ts',
        line: 3,
        use: 'decorator',
      },
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 5,
        use: 'decorator',
      },
    ])
  })

  it('recognizes an aliased import by its SDK name', () => {
    const references = referencesOf('alias', {
      'pet.ts': [
        "import { BidirektField as Field } from '@bidirekt/typescript-sdk'",
        '',
        'export class Pet {',
        '  @Field()',
        '  name!: string',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 4,
        use: 'decorator',
      },
    ])
  })

  it('recognizes a namespace import', () => {
    const references = referencesOf('namespace', {
      'pet.ts': [
        "import * as bidirekt from '@bidirekt/typescript-sdk'",
        '',
        'export class Pet {',
        '  @bidirekt.BidirektField()',
        '  name!: string',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 4,
        use: 'decorator',
      },
    ])
  })

  it('recognizes an export re-exported by a project barrel', () => {
    const references = referencesOf('barrel', {
      'contracts/index.ts': [
        "export { BidirektField as ContractField } from '@bidirekt/typescript-sdk'",
        '',
      ].join('\n'),
      'pet.ts': [
        "import { ContractField } from './contracts/index.ts'",
        '',
        'export class Pet {',
        '  @ContractField()',
        '  name!: string',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 4,
        use: 'decorator',
      },
    ])
  })

  it('recognizes a decorator in a .js file', () => {
    const references = referencesOf('javascript', {
      'pet.js': [
        "import { BidirektSchema } from '@bidirekt/typescript-sdk'",
        '',
        '@BidirektSchema()',
        'export class Pet {}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektSchema',
        file: 'pet.js',
        line: 3,
        use: 'decorator',
      },
    ])
  })

  it('reports a reference that is not called', () => {
    const references = referencesOf('not-called', {
      'pet.ts': [
        "import { BidirektField } from '@bidirekt/typescript-sdk'",
        '',
        'export const ContractField = BidirektField',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 3,
        use: 'misplaced',
      },
    ])
  })

  it('ignores a BidirektField from another module in a project that imports the SDK', () => {
    const references = referencesOf('foreign', {
      'other/decorators.ts': [
        'export function BidirektField() {',
        '  return () => undefined',
        '}',
        '',
      ].join('\n'),
      'pet.ts': [
        "import { BidirektSchema } from '@bidirekt/typescript-sdk'",
        "import { BidirektField } from './other/decorators.ts'",
        '',
        '@BidirektSchema()',
        'export class Pet {',
        '  @BidirektField()',
        '  name!: string',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektSchema',
        file: 'pet.ts',
        line: 4,
        use: 'decorator',
      },
    ])
  })

  it('reports an annotation referenced by an object shorthand or a destructuring', () => {
    const references = referencesOf('shorthand', {
      'pet.ts': [
        "import * as sdk from '@bidirekt/typescript-sdk'",
        "import { BidirektField } from '@bidirekt/typescript-sdk'",
        '',
        'export const contract = { BidirektField }',
        'export const { BidirektSchema } = sdk',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 4,
        use: 'misplaced',
      },
      {
        name: 'BidirektSchema',
        file: 'pet.ts',
        line: 5,
        use: 'misplaced',
      },
    ])
  })

  it('reads a file with an expression nested 5,000 levels deep', () => {
    const references = referencesOf('deep', {
      'pet.ts': [
        "import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'",
        '',
        `export const total = ${Array(5000).fill('1').join(' + ')}`,
        '',
        '@BidirektSchema()',
        'export class Pet {',
        '  @BidirektField()',
        '  name!: string',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(references, [
      {
        name: 'BidirektSchema',
        file: 'pet.ts',
        line: 5,
        use: 'decorator',
      },
      {
        name: 'BidirektField',
        file: 'pet.ts',
        line: 7,
        use: 'decorator',
      },
    ])
  })

  it('reports a decorator of a protocol that is not registered', () => {
    const source = [
      "import { BidirektRestProvider } from '@bidirekt/typescript-sdk'",
      '',
      'export class PetsController {',
      "  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: {} })",
      '  list() {}',
      '}',
      '',
    ].join('\n')

    const registered = referencesOf('registered', { 'pets.ts': source })
    const unregistered = referencesOf('unregistered', { 'pets.ts': source }, [])

    assert.deepEqual(registered, [
      {
        name: 'BidirektRestProvider',
        file: 'pets.ts',
        line: 4,
        use: 'decorator',
      },
    ])
    assert.deepEqual(unregistered, [
      {
        name: 'BidirektRestProvider',
        file: 'pets.ts',
        line: 4,
        use: 'unregistered',
      },
    ])
  })
})
