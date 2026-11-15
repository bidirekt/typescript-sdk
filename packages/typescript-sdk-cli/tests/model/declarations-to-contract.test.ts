import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  Contract,
  NamedSchema,
  ProvidedResource,
  SchemaNode,
} from '../../src/model/contract.ts'
import { declarationsToContract } from '../../src/model/declarations-to-contract.ts'

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

function listing(
  file: string,
  schema: string | null,
  path = '/pets',
): ProvidedResource {
  return {
    method: 'GET',
    path,
    responses: [{ status: 200, schema, location: { file, line: 3 } }],
    location: { file, line: 2 },
  }
}

function declarations(
  schemas: Array<NamedSchema>,
  provides: Array<ProvidedResource> = [],
): Contract {
  return { provides, consumes: [], schemas }
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
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(contract.schemas, [pet(1), owner])
  })

  it('writes an identical derived list used in several places once', () => {
    const { contract, errors } = declarationsToContract(
      declarations(
        [
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
        ],
        [
          listing('src/a.ts', 'PetList'),
          listing('src/b.ts', 'PetList', '/pets/recent'),
        ],
      ),
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(
      contract.schemas.map((schema) => schema.name),
      ['Pet', 'PetList'],
    )
  })

  it('rejects two schemas with the same name at both places', () => {
    const { errors } = declarationsToContract(declarations([pet(1), pet(8)]))
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
    const { errors } = declarationsToContract(declarations([schema]))
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
    )
    const message =
      'list name "PetList" is also the name of another schema: give the list a distinct name'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/pet-list.ts', line: 4 } },
      { message, location: { file: 'src/a.ts', line: 3 } },
    ])
  })

  it('rejects a body that references a name no schema has, at its line', () => {
    const { errors } = declarationsToContract(
      declarations([pet(1)], [listing('src/a.ts', 'PetResponse')]),
    )
    assert.deepEqual(errors, [
      {
        message:
          'schema "PetResponse" is not declared: reference a schema by its name in the contract',
        location: { file: 'src/a.ts', line: 3 },
      },
    ])
  })

  it('accepts a body without a schema', () => {
    const { errors } = declarationsToContract(
      declarations([], [listing('src/a.ts', null)]),
    )
    assert.deepEqual(errors, [])
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
