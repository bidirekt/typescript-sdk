import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { YAMLMap } from 'yaml'
import type { ProtocolModule } from '../../src/protocols.ts'
import { programToTaggedComments } from '../../src/reader/comment-tags.ts'
import { projectToProgram } from '../../src/reader/program.ts'

const root = mkdtempSync(join(tmpdir(), 'reader-comment-tags-'))

after(() => rmSync(root, { recursive: true, force: true }))

const deepExpression = `export const total = ${Array(5000).fill('1').join(' + ')}`

const calls: ProtocolModule<number> = {
  name: 'calls',
  exports: {},
  tagKeywords: ['reply'],
  read: () => ({ blocks: [], derived: [], errors: [] }),
  merge: (sideBlocks) => ({ block: sideBlocks.length, errors: [] }),
  references: () => [],
  isEmpty: (block) => block === 0,
  toYaml: () => new YAMLMap(),
}

function tagsOf(
  name: string,
  files: Record<string, string>,
  protocols: ReadonlyArray<ProtocolModule> = [],
) {
  const directory = join(root, name)
  mkdirSync(directory)
  for (const [path, content] of Object.entries(files)) {
    writeFileSync(join(directory, path), content)
  }
  const projectProgram = projectToProgram({ directory })
  if ('message' in projectProgram) {
    assert.fail(`unexpected diagnostic: ${projectProgram.message}`)
  }
  const read = programToTaggedComments(projectProgram, protocols)
  return {
    tags: read.comments.flatMap(({ tags }) =>
      tags.map(({ keyword, protocol, arguments: words, location }) => ({
        keyword,
        protocol: protocol ?? 'core',
        arguments: words,
        line: location.line,
      })),
    ),
    errors: read.errors,
    warnings: read.warnings,
  }
}

describe('programToTaggedComments', () => {
  it('reads the tags of a file with an expression nested 5,000 levels deep', () => {
    const read = tagsOf('deep', {
      'pets.ts': [
        deepExpression,
        '',
        '/** @bidirekt schema name=Animal */',
        'export class Pet {',
        '  /** @bidirekt field type=string */',
        '  name',
        '}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(read, {
      tags: [
        {
          keyword: 'schema',
          protocol: 'core',
          arguments: ['name=Animal'],
          line: 3,
        },
        {
          keyword: 'field',
          protocol: 'core',
          arguments: ['type=string'],
          line: 5,
        },
      ],
      errors: [],
      warnings: [],
    })
  })

  it('does not walk a file whose "@bidirekt" is outside a /** */ comment', () => {
    const read = tagsOf('untagged', {
      'pets.ts': [
        '// @bidirekt schema Pet is not a tag in a line comment',
        "export const sdk = '@bidirekt/typescript-sdk'",
        deepExpression,
        '',
      ].join('\n'),
    })

    assert.deepEqual(read, { tags: [], errors: [], warnings: [] })
  })

  it('reads the name and the words of a registered protocol as its tags', () => {
    const read = tagsOf(
      'protocol-words',
      {
        'pets.ts': [
          '/**',
          ' * @bidirekt calls dial pets_api',
          ' * @bidirekt reply ok',
          ' */',
          'export function listPets() {}',
          '',
        ].join('\n'),
      },
      [calls],
    )

    assert.deepEqual(read, {
      tags: [
        {
          keyword: 'calls',
          protocol: 'calls',
          arguments: ['dial', 'pets_api'],
          line: 2,
        },
        { keyword: 'reply', protocol: 'calls', arguments: ['ok'], line: 3 },
      ],
      errors: [],
      warnings: [],
    })
  })

  it('lists only the registered words in the error of an unknown tag', () => {
    const files = {
      'pets.ts': [
        '/** @bidirekt rest provides GET /pets */',
        'export function listPets() {}',
        '',
      ].join('\n'),
    }

    const withoutProtocols = tagsOf('unknown-without-protocols', files)
    const withProtocol = tagsOf('unknown-with-protocol', files, [calls])

    assert.deepEqual(
      withoutProtocols.errors.map(({ message }) => message),
      ['unknown tag "@bidirekt rest": use schema or field'],
    )
    assert.deepEqual(
      withProtocol.errors.map(({ message }) => message),
      ['unknown tag "@bidirekt rest": use calls, reply, schema or field'],
    )
  })
})
