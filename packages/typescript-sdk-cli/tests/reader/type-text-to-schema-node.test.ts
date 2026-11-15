import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { typeTextToSchemaNode } from '../../src/reader/type-text-to-schema-node.ts'

describe('typeTextToSchemaNode', () => {
  it('reads every primitive', () => {
    for (const type of ['string', 'integer', 'float', 'number', 'boolean']) {
      assert.deepEqual(typeTextToSchemaNode(type), { type })
    }
  })

  it('reads a list and a map', () => {
    assert.deepEqual(typeTextToSchemaNode('integer[]'), {
      type: 'array',
      items: { type: 'integer' },
    })
    assert.deepEqual(typeTextToSchemaNode('map<float>'), {
      type: 'map',
      values: { type: 'float' },
    })
  })

  it('reads lists and maps nested in each other', () => {
    assert.deepEqual(typeTextToSchemaNode('integer[][]'), {
      type: 'array',
      items: { type: 'array', items: { type: 'integer' } },
    })
    assert.deepEqual(typeTextToSchemaNode('map<float[]>'), {
      type: 'map',
      values: { type: 'array', items: { type: 'float' } },
    })
    assert.deepEqual(typeTextToSchemaNode('map<map<string>>[]'), {
      type: 'array',
      items: {
        type: 'map',
        values: { type: 'map', values: { type: 'string' } },
      },
    })
  })

  it('rejects text outside the grammar', () => {
    for (const text of [
      '',
      'date',
      'Pet',
      'integer[',
      '[]',
      'map<>',
      'map<integer',
      'map<string, integer>',
      'map< integer >',
      'Array<integer>',
    ]) {
      assert.equal(typeTextToSchemaNode(text), undefined, text)
    }
  })
})
