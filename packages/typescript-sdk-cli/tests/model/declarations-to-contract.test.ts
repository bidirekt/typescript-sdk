import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { YAMLMap } from 'yaml'
import type {
  NamedSchema,
  SchemaNode,
  SourceLocation,
} from '../../src/model/contract.ts'
import {
  contractToProtocolBlocks,
  declarationsToContract,
} from '../../src/model/declarations-to-contract.ts'
import type { Declarations } from '../../src/model/declarations-to-contract.ts'
import type {
  ProtocolModule,
  Reference,
  SideBlock,
} from '../../src/protocols.ts'

const petList: SchemaNode = {
  type: 'array',
  items: { type: 'ref', schema: 'Pet' },
}

function pet(line: number): NamedSchema {
  return {
    name: 'Pet',
    location: { file: 'src/pet.ts', line },
    node: {
      type: 'object',
      properties: [
        {
          name: 'name',
          location: { file: 'src/pet.ts', line: line + 1 },
          node: { type: 'string' },
        },
      ],
    },
  }
}

const callsMergeError = {
  message: 'calls are merged with an error',
  location: { file: 'src/calls.ts', line: 9 },
}

const calls: ProtocolModule<Array<Reference>> = {
  name: 'calls',
  exports: {},
  tagKeywords: [],
  read: () => ({ blocks: [], derived: [], errors: [] }),
  merge: (sideBlocks) => {
    const block = sideBlocks.flatMap((sideBlock) => sideBlock.block)
    if (block.some(({ schema }) => schema === 'Conflict')) {
      return { block, errors: [callsMergeError] }
    }
    return { block, errors: [] }
  },
  references: (block) => block,
  isEmpty: (block) => block.length === 0,
  toYaml: () => new YAMLMap(),
  vocabulary: {
    fieldDecorator: 'CallsField',
    fieldOptions: ['arguments'],
    toNode: (options, node) => ({ ...node, extra: options }),
    toYaml: () => undefined,
    references: (node) => {
      const fieldArguments = node.extra?.arguments
      if (typeof fieldArguments !== 'string') {
        return []
      }
      return [fieldArguments]
    },
  },
}

function call(schema: string, line: number): Reference {
  const location: SourceLocation = { file: 'src/calls.ts', line }
  return { schema, location }
}

function declarations(
  schemas: Array<NamedSchema>,
  blocks: Array<SideBlock<Array<Reference>>> = [],
): Declarations {
  return { blocks: new Map([['calls', blocks]]), schemas }
}

describe('declarationsToContract', () => {
  it('keeps every named schema, referenced or not', () => {
    const owner: NamedSchema = {
      name: 'Owner',
      location: { file: 'src/owner.ts', line: 1 },
      node: { type: 'object', properties: [] },
    }
    const { contract, errors } = declarationsToContract(
      declarations([pet(1), owner]),
      [calls],
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(contract.schemas, [pet(1), owner])
  })

  it('writes an identical derived list used in several places once', () => {
    const { contract, errors } = declarationsToContract(
      declarations([
        pet(1),
        {
          name: 'PetList',
          location: { file: 'src/a.ts', line: 3 },
          node: petList,
        },
        {
          name: 'PetList',
          location: { file: 'src/b.ts', line: 3 },
          node: { type: 'array', items: { type: 'ref', schema: 'Pet' } },
        },
      ]),
      [calls],
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(
      contract.schemas.map((schema) => schema.name),
      ['Pet', 'PetList'],
    )
  })

  it('rejects two schemas with the same name at both places', () => {
    const { errors } = declarationsToContract(declarations([pet(1), pet(8)]), [
      calls,
    ])
    const message =
      'schema name "Pet" is declared more than once: give each schema a distinct name'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/pet.ts', line: 1 } },
      { message, location: { file: 'src/pet.ts', line: 8 } },
    ])
  })

  it('rejects two fields with the same name in one schema at both places', () => {
    const schema: NamedSchema = {
      name: 'Pet',
      location: { file: 'src/pet.ts', line: 1 },
      node: {
        type: 'object',
        properties: [
          {
            name: 'id',
            location: { file: 'src/entity.ts', line: 2 },
            node: { type: 'string' },
          },
          {
            name: 'id',
            location: { file: 'src/pet.ts', line: 2 },
            node: { type: 'integer' },
          },
        ],
      },
    }
    const { errors } = declarationsToContract(declarations([schema]), [calls])
    const message =
      'field "id" is declared more than once in schema "Pet": give each field a distinct name'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/entity.ts', line: 2 } },
      { message, location: { file: 'src/pet.ts', line: 2 } },
    ])
  })

  it('rejects two lists with the same name that differ at both places', () => {
    const { errors } = declarationsToContract(
      declarations([
        pet(1),
        {
          name: 'PetList',
          location: { file: 'src/a.ts', line: 3 },
          node: petList,
        },
        {
          name: 'PetList',
          location: { file: 'src/b.ts', line: 3 },
          node: { ...petList, nullable: true },
        },
      ]),
      [calls],
    )
    const message =
      'lists named "PetList" differ: give each list a distinct name'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/a.ts', line: 3 } },
      { message, location: { file: 'src/b.ts', line: 3 } },
    ])
  })

  it('rejects a derived list name that collides with a declared schema', () => {
    const { errors } = declarationsToContract(
      declarations([
        pet(1),
        {
          name: 'PetList',
          location: { file: 'src/pet-list.ts', line: 4 },
          node: { type: 'object', properties: [] },
        },
        {
          name: 'PetList',
          location: { file: 'src/a.ts', line: 3 },
          node: petList,
        },
      ]),
      [calls],
    )
    const message =
      'list name "PetList" is also the name of another schema: give the list a distinct name'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/pet-list.ts', line: 4 } },
      { message, location: { file: 'src/a.ts', line: 3 } },
    ])
  })

  it('merges the blocks of each side of a protocol into one block', () => {
    const { contract, errors } = declarationsToContract(
      declarations(
        [pet(1)],
        [
          { block: [call('Pet', 1)] },
          { provider: 'payments_api', block: [call('Pet', 2)] },
          { block: [call('Pet', 3)] },
          { provider: 'auth_api', block: [call('Pet', 4)] },
          { provider: 'payments_api', block: [call('Pet', 5)] },
        ],
      ),
      [calls],
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(
      contract.provides,
      new Map([['calls', [call('Pet', 1), call('Pet', 3)]]]),
    )
    assert.deepEqual(
      contract.consumes,
      new Map([
        [
          'payments_api',
          new Map([['calls', [call('Pet', 2), call('Pet', 5)]]]),
        ],
        ['auth_api', new Map([['calls', [call('Pet', 4)]]])],
      ]),
    )
  })

  it('leaves the blocks of an unregistered protocol out', () => {
    const { contract, errors } = declarationsToContract(
      declarations([pet(1)], [{ block: [call('Missing', 1)] }]),
      [],
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(contract.provides, new Map())
    assert.deepEqual(contract.consumes, new Map())
  })

  it('reports the errors of merging the blocks of a protocol', () => {
    const { errors } = declarationsToContract(
      declarations(
        [pet(1)],
        [{ block: [call('Pet', 1)] }, { block: [call('Conflict', 2)] }],
      ),
      [calls],
    )
    assert.deepEqual(errors, [
      callsMergeError,
      {
        message:
          'schema "Conflict" is not declared: reference a schema by its name in the contract',
        location: { file: 'src/calls.ts', line: 2 },
      },
    ])
  })

  it('rejects a reference of a protocol block to a name no schema has, at its line', () => {
    const { errors } = declarationsToContract(
      declarations([pet(1)], [{ block: [call('PetResponse', 3)] }]),
      [calls],
    )
    assert.deepEqual(errors, [
      {
        message:
          'schema "PetResponse" is not declared: reference a schema by its name in the contract',
        location: { file: 'src/calls.ts', line: 3 },
      },
    ])
  })

  it('rejects a name the vocabulary of a node references and no schema has, at its line', () => {
    const ticket: NamedSchema = {
      name: 'Ticket',
      location: { file: 'src/ticket.ts', line: 1 },
      node: {
        type: 'object',
        properties: [
          {
            name: 'replies',
            location: { file: 'src/ticket.ts', line: 2 },
            node: { type: 'string', extra: { arguments: 'ReplyArgs' } },
          },
        ],
      },
    }
    const { errors } = declarationsToContract(declarations([ticket]), [calls])
    assert.deepEqual(errors, [
      {
        message:
          'schema "ReplyArgs" is not declared: reference a schema by its name in the contract',
        location: { file: 'src/ticket.ts', line: 2 },
      },
    ])
  })

  it('rejects a reference inside a schema to a name no schema has', () => {
    const { errors } = declarationsToContract(
      declarations([
        {
          name: 'PetList',
          location: { file: 'src/a.ts', line: 3 },
          node: petList,
        },
      ]),
      [calls],
    )
    assert.deepEqual(errors, [
      {
        message:
          'schema "Pet" is not declared: reference a schema by its name in the contract',
        location: { file: 'src/a.ts', line: 3 },
      },
    ])
  })
})

describe('contractToProtocolBlocks', () => {
  it('lists the blocks of the provided side, then of each provider', () => {
    const { contract } = declarationsToContract(
      declarations(
        [pet(1)],
        [
          { provider: 'payments_api', block: [call('Pet', 1)] },
          { block: [call('Pet', 2)] },
        ],
      ),
      [calls],
    )
    assert.deepEqual(contractToProtocolBlocks(contract, [calls]), [
      { protocol: calls, block: [call('Pet', 2)] },
      { protocol: calls, block: [call('Pet', 1)] },
    ])
  })
})
