import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SourceLocation } from '../../src/model/contract.ts'
import {
  listToNamedSchema,
  schemaToListName,
} from '../../src/model/schema-names.ts'

const at: SourceLocation = { file: 'src/pets.ts', line: 7 }

describe('schemaToListName', () => {
  it('names a list after its schema', () => {
    assert.equal(schemaToListName('Pet'), 'PetList')
  })
})

describe('listToNamedSchema', () => {
  it('derives the list name from the schema of its items', () => {
    assert.deepEqual(listToNamedSchema('Pet', undefined, at), {
      name: 'PetList',
      node: { type: 'array', items: { type: 'ref', schema: 'Pet' } },
      location: at,
    })
  })

  it('uses the declared list name', () => {
    assert.deepEqual(listToNamedSchema('Pet', 'PetCollection', at), {
      name: 'PetCollection',
      node: { type: 'array', items: { type: 'ref', schema: 'Pet' } },
      location: at,
    })
  })
})
