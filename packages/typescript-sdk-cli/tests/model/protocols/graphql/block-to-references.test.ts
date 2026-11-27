import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blockToReferences } from '../../../../src/model/protocols/graphql/block-to-references.ts'

describe('blockToReferences', () => {
  it('references the arguments and the returns of each operation at their lines', () => {
    assert.deepEqual(
      blockToReferences({
        operations: [
          {
            kind: 'query',
            name: 'pet',
            arguments: {
              schema: 'PetArgs',
              location: { file: 'src/a.ts', line: 4 },
            },
            returns: {
              schema: 'MaybePet',
              location: { file: 'src/a.ts', line: 5 },
            },
            location: { file: 'src/a.ts', line: 3 },
          },
          {
            kind: 'query',
            name: 'pets',
            returns: {
              schema: 'PetList',
              location: { file: 'src/a.ts', line: 9 },
            },
            location: { file: 'src/a.ts', line: 8 },
          },
        ],
      }),
      [
        { schema: 'PetArgs', location: { file: 'src/a.ts', line: 4 } },
        { schema: 'MaybePet', location: { file: 'src/a.ts', line: 5 } },
        { schema: 'PetList', location: { file: 'src/a.ts', line: 9 } },
      ],
    )
  })

  it('references nothing for a graph', () => {
    assert.deepEqual(
      blockToReferences({
        operations: [],
        graph: {
          name: 'petstore_graph',
          location: { file: 'src/a.ts', line: 1 },
        },
      }),
      [],
    )
  })
})
