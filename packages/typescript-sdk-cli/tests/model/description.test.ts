import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SourceLocation } from '../../src/model/contract.ts'
import { descriptionToDiagnostic } from '../../src/model/description.ts'

const at: SourceLocation = { file: 'src/pet.ts', line: 7 }

describe('descriptionToDiagnostic', () => {
  it('accepts ASCII letters and digits with single spaces between words', () => {
    for (const description of [
      'Name',
      '123',
      '0x1F',
      'ISO 8601 date',
      'Shown on the card',
    ]) {
      assert.equal(
        descriptionToDiagnostic(description, at),
        undefined,
        description,
      )
    }
  })

  it('rejects an empty description', () => {
    assert.deepEqual(descriptionToDiagnostic('', at), {
      message:
        '"description" is empty: write a description or leave "description" out',
      location: at,
    })
  })

  it('rejects any other character, quoting the description', () => {
    for (const [description, quoted] of [
      ['Price, in cents', '"Price, in cents"'],
      ['In kilograms.', '"In kilograms."'],
      ["The pet's age", '"The pet\'s age"'],
      ['two  spaces', '"two  spaces"'],
      [' leading space', '" leading space"'],
      ['trailing space ', '"trailing space "'],
      ['Peso em média', '"Peso em média"'],
      ['a\tb', '"a\\tb"'],
      ['two\nlines', '"two\\nlines"'],
    ]) {
      assert.deepEqual(
        descriptionToDiagnostic(description, at),
        {
          message: `description ${quoted} must be ASCII letters and digits, with single spaces between words: remove or replace the other characters`,
          location: at,
        },
        description,
      )
    }
  })
})
