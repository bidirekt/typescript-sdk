import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SchemaNode } from '../../../../src/model/contract.ts'
import {
  fieldOptionsToLeaf,
  fieldOptionsToNode,
  nodeToArguments,
  nodeToArgumentsSchemas,
  nodeToScalar,
  scalarToNode,
} from '../../../../src/model/protocols/graphql/field-extra.ts'

describe('fieldOptionsToLeaf', () => {
  it('makes the scalar the leaf, without the arguments', () => {
    const leaf = fieldOptionsToLeaf({
      scalar: 'DateTime',
      arguments: 'ReviewsArgs',
    })
    assert.ok(leaf)
    assert.equal(nodeToScalar(leaf), 'DateTime')
    assert.equal(nodeToArguments(leaf), undefined)
  })

  it('leaves the leaf to the type without a scalar', () => {
    assert.equal(fieldOptionsToLeaf({ arguments: 'ReviewsArgs' }), undefined)
  })
})

describe('fieldOptionsToNode', () => {
  it('leaves a node without options as it is', () => {
    const node: SchemaNode = { type: 'string', optional: true }
    assert.deepEqual(fieldOptionsToNode({}, node), node)
  })

  it('leaves the scalar to the leaf', () => {
    const node: SchemaNode = { type: 'string', optional: true }
    assert.deepEqual(fieldOptionsToNode({ scalar: 'DateTime' }, node), node)
  })

  it('keeps the scalar of the leaf when it adds the arguments', () => {
    const node = fieldOptionsToNode(
      { arguments: 'ReviewsArgs' },
      scalarToNode('DateTime'),
    )
    assert.equal(nodeToScalar(node), 'DateTime')
    assert.equal(nodeToArguments(node), 'ReviewsArgs')
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
