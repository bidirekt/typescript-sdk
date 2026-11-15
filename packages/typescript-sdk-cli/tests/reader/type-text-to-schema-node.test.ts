import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  tagTypeTextToSchemaNode,
  typeTextToSchemaNode,
} from '../../src/reader/type-text-to-schema-node.ts'

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

describe('tagTypeTextToSchemaNode', () => {
  it('reads a schema name alone or inside a list or a map', () => {
    assert.deepEqual(tagTypeTextToSchemaNode('HealthCheck'), {
      type: 'ref',
      schema: 'HealthCheck',
    })
    assert.deepEqual(tagTypeTextToSchemaNode('HealthCheck[]'), {
      type: 'array',
      items: { type: 'ref', schema: 'HealthCheck' },
    })
    assert.deepEqual(tagTypeTextToSchemaNode('map<HealthCheck>'), {
      type: 'map',
      values: { type: 'ref', schema: 'HealthCheck' },
    })
  })

  it('reads a primitive before a schema name', () => {
    assert.deepEqual(tagTypeTextToSchemaNode('integer'), { type: 'integer' })
  })

  it('rejects text that is not a name, a list or a map', () => {
    for (const text of ['', 'map<integer', 'map<string, integer>', 'a:b']) {
      assert.equal(tagTypeTextToSchemaNode(text), undefined, text)
    }
  })
})
