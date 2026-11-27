import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultProtocols } from '../src/protocols.ts'

const coreWords = ['schema', 'field']

const coreDecorators = ['BidirektSchema', 'BidirektField']

describe('defaultProtocols', () => {
  it('registers every word after "@bidirekt" once, apart from the core words', () => {
    const words = [
      ...coreWords,
      ...defaultProtocols.flatMap(({ name, tagKeywords }) => [
        name,
        ...tagKeywords,
      ]),
    ]

    assert.deepEqual(words, [...new Set(words)])
  })

  it('registers every decorator once, apart from the core decorators', () => {
    const decorators = [
      ...coreDecorators,
      ...defaultProtocols.flatMap(({ exports }) => Object.keys(exports)),
    ]

    assert.deepEqual(decorators, [...new Set(decorators)])
  })
})
