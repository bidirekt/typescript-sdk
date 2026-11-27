import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Document } from 'yaml'
import type { SourceLocation } from '../../../../src/model/contract.ts'
import type {
  GraphqlBlock,
  Operation,
} from '../../../../src/model/protocols/graphql/contract.ts'
import { blockToYaml } from '../../../../src/writer/protocols/graphql/block-to-yaml.ts'

const at: SourceLocation = { file: 'src/clients.ts', line: 1 }

function operation(
  kind: Operation['kind'],
  name: string,
  returns: string,
): Operation {
  return {
    kind,
    name,
    returns: { schema: returns, location: at },
    location: at,
  }
}

function blockToText(block: GraphqlBlock): string {
  return new Document(blockToYaml(block)).toString()
}

describe('blockToYaml', () => {
  it('writes the queries, then the mutations, each by name', () => {
    const pet = operation('query', 'pet', 'MaybePet')
    pet.arguments = { schema: 'PetArgs', location: at }
    assert.equal(
      blockToText({
        operations: [
          operation('mutation', 'adoptPet', 'Pet'),
          operation('query', 'pets', 'PetList'),
          pet,
          operation('mutation', 'deletePet', 'Boolean'),
        ],
      }),
      `query:
  pet:
    arguments: PetArgs
    returns: MaybePet
  pets:
    returns: PetList
mutation:
  adoptPet:
    returns: Pet
  deletePet:
    returns: Boolean
`,
    )
  })

  it('writes the graph', () => {
    assert.equal(
      blockToText({
        operations: [],
        graph: { name: 'petstore_graph', location: at },
      }),
      'graph: petstore_graph\n',
    )
  })
})
