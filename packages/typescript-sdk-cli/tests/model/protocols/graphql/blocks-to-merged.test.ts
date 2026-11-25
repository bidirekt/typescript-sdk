import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  GraphqlBlock,
  Operation,
} from '../../../../src/model/protocols/graphql/contract.ts'
import { sideBlocksToMerged } from '../../../../src/model/protocols/graphql/blocks-to-merged.ts'
import type { SideBlock } from '../../../../src/protocols.ts'

function pet(
  file: string,
  returns: string,
  argumentsSchema?: string,
): SideBlock<GraphqlBlock> {
  const operation: Operation = {
    kind: 'query',
    name: 'pet',
    returns: { schema: returns, location: { file, line: 3 } },
    location: { file, line: 2 },
  }
  if (argumentsSchema !== undefined) {
    operation.arguments = {
      schema: argumentsSchema,
      location: { file, line: 4 },
    }
  }
  return { provider: 'petstore_api', block: { operations: [operation] } }
}

function graph(
  file: string,
  line: number,
  name: string,
): SideBlock<GraphqlBlock> {
  return {
    block: { operations: [], graph: { name, location: { file, line } } },
  }
}

describe('sideBlocksToMerged', () => {
  it('keeps one operation for handlers that declare the same one', () => {
    const { block, errors } = sideBlocksToMerged([
      pet('src/a.ts', 'MaybePet', 'PetArgs'),
      pet('src/b.ts', 'MaybePet', 'PetArgs'),
    ])
    assert.deepEqual(errors, [])
    assert.deepEqual(block, pet('src/a.ts', 'MaybePet', 'PetArgs').block)
  })

  it('keeps a query and a mutation of the same name apart', () => {
    const mutation: Operation = {
      ...pet('src/b.ts', 'Pet').block.operations[0],
      kind: 'mutation',
    }
    const { block, errors } = sideBlocksToMerged([
      pet('src/a.ts', 'Pet'),
      { provider: 'petstore_api', block: { operations: [mutation] } },
    ])
    assert.deepEqual(errors, [])
    assert.deepEqual(
      block.operations.map(({ kind }) => kind),
      ['query', 'mutation'],
    )
  })

  it('rejects handlers whose returns differ, at both returns', () => {
    const { errors } = sideBlocksToMerged([
      pet('src/a.ts', 'MaybePet'),
      pet('src/b.ts', 'Pet'),
    ])
    const message =
      'returns of query pet consumed from "petstore_api" is declared as MaybePet and Pet: declare the same returns in every handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/a.ts', line: 3 } },
      { message, location: { file: 'src/b.ts', line: 3 } },
    ])
  })

  it('rejects handlers whose arguments differ, at both arguments', () => {
    const { errors } = sideBlocksToMerged([
      pet('src/a.ts', 'Pet', 'PetArgs'),
      pet('src/b.ts', 'Pet', 'PetByNameArgs'),
    ])
    const message =
      'arguments of query pet consumed from "petstore_api" is declared as PetArgs and PetByNameArgs: declare the same arguments in every handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/a.ts', line: 4 } },
      { message, location: { file: 'src/b.ts', line: 4 } },
    ])
  })

  it('rejects arguments declared in one handler only, at the arguments and at the other handler', () => {
    const { errors } = sideBlocksToMerged([
      pet('src/a.ts', 'Pet', 'PetArgs'),
      pet('src/b.ts', 'Pet'),
    ])
    const message =
      'arguments of query pet consumed from "petstore_api" is declared in one handler and not in another: declare the same arguments in every handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/a.ts', line: 4 } },
      { message, location: { file: 'src/b.ts', line: 2 } },
    ])
  })

  it('keeps one graph for declarations of the same name', () => {
    const { block, errors } = sideBlocksToMerged([
      graph('src/b.ts', 1, 'petstore_graph'),
      graph('src/a.ts', 5, 'petstore_graph'),
    ])
    assert.deepEqual(errors, [])
    assert.deepEqual(block, {
      operations: [],
      graph: {
        name: 'petstore_graph',
        location: { file: 'src/a.ts', line: 5 },
      },
    })
  })

  it('rejects two graph names at the first declaration and at the other one', () => {
    const { errors } = sideBlocksToMerged([
      graph('src/b.ts', 1, 'other_graph'),
      graph('src/a.ts', 5, 'petstore_graph'),
    ])
    const message =
      'the graph is declared as "petstore_graph" and "other_graph": declare one graph name in every @BidirektGraph'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/a.ts', line: 5 } },
      { message, location: { file: 'src/b.ts', line: 1 } },
    ])
  })
})
