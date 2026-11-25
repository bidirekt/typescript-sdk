import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SchemaNode } from '../../../../src/model/contract.ts'
import {
  fieldOptionsToNode,
  nodeToArguments,
  nodeToArgumentsSchemas,
  nodeToScalar,
} from '../../../../src/model/protocols/graphql/field-extra.ts'

describe('fieldOptionsToNode', () => {
  it('leaves a node without options as it is', () => {
    const node: SchemaNode = { type: 'string', optional: true }
    assert.deepEqual(fieldOptionsToNode({}, node), node)
  })

  it('turns the node into the scalar and keeps its flags', () => {
    const node = fieldOptionsToNode(
      { scalar: 'DateTime' },
      { type: 'string', optional: true, nullable: true, description: 'Born' },
    )
    assert.equal(nodeToScalar(node), 'DateTime')
    assert.deepEqual(
      [node.optional, node.nullable, node.description],
      [true, true, 'Born'],
    )
  })

  it('turns the items of a list into the scalar', () => {
    const node = fieldOptionsToNode(
      { scalar: 'DateTime' },
      { type: 'array', items: { type: 'string', nullable: true } },
    )
    assert.equal(node.type, 'array')
    assert.equal(nodeToScalar(node), undefined)
    assert.equal(nodeToScalar(node.items), 'DateTime')
    assert.equal(node.items.nullable, true)
  })

  it('adds the arguments to the node itself and references them', () => {
    const node = fieldOptionsToNode(
      { arguments: 'ReviewsArgs' },
      { type: 'array', items: { type: 'ref', schema: 'Review' } },
    )
    assert.equal(nodeToArguments(node), 'ReviewsArgs')
    assert.deepEqual(nodeToArgumentsSchemas(node), ['ReviewsArgs'])
  })

  it('keeps the extra of other vocabularies', () => {
    const node = fieldOptionsToNode(
      { arguments: 'ReviewsArgs' },
      { type: 'string', extra: { other: 'kept' } },
    )
    assert.equal(node.extra?.other, 'kept')
  })

  it('references nothing for a node without arguments', () => {
    assert.deepEqual(nodeToArgumentsSchemas({ type: 'string' }), [])
  })
})
