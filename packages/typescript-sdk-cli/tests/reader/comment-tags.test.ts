import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { programToTaggedComments } from '../../src/reader/comment-tags.ts'
import { projectToProgram } from '../../src/reader/program.ts'

const root = mkdtempSync(join(tmpdir(), 'reader-comment-tags-'))

after(() => rmSync(root, { recursive: true, force: true }))

const deepExpression = `export const total = ${Array(5000).fill('1').join(' + ')}`

function tagsOf(name: string, files: Record<string, string>) {
  const directory = join(root, name)
  mkdirSync(directory)
  for (const [path, content] of Object.entries(files)) {
    writeFileSync(join(directory, path), content)
  }
  const projectProgram = projectToProgram({ directory })
  if ('message' in projectProgram) {
    assert.fail(`unexpected diagnostic: ${projectProgram.message}`)
  }
  const read = programToTaggedComments(projectProgram)
  return {
    tags: read.comments.flatMap(({ tags }) =>
      tags.map(({ keyword, arguments: words, location }) => ({
        keyword,
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
        '/**',
        ' * @bidirekt provides GET /pets',
        ' * @bidirekt response 204',
        ' */',
        'export function listPets() {}',
        '',
      ].join('\n'),
    })

    assert.deepEqual(read, {
      tags: [
        { keyword: 'provides', arguments: ['GET', '/pets'], line: 4 },
        { keyword: 'response', arguments: ['204'], line: 5 },
      ],
      errors: [],
      warnings: [],
    })
  })

  it('does not walk a file whose "@bidirekt" is outside a /** */ comment', () => {
    const read = tagsOf('untagged', {
      'pets.ts': [
        '// @bidirekt provides GET /pets is not a tag in a line comment',
        "export const sdk = '@bidirekt/typescript-sdk'",
        deepExpression,
        '',
      ].join('\n'),
    })

    assert.deepEqual(read, { tags: [], errors: [], warnings: [] })
  })
})
