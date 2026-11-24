import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Resource } from '../../../../src/model/protocols/rest/contract.ts'
import { resourcesToReferences } from '../../../../src/model/protocols/rest/resources-to-references.ts'

function listing(file: string, schema: string | null): Resource {
  return {
    method: 'GET',
    path: '/pets',
    responses: [{ status: 200, schema, location: { file, line: 3 } }],
    location: { file, line: 2 },
  }
}

describe('resourcesToReferences', () => {
  it('references the schema of a request and of each response at its line', () => {
    const resource: Resource = {
      ...listing('src/a.ts', 'Pet'),
      request: { schema: 'NewPet', location: { file: 'src/a.ts', line: 4 } },
    }
    assert.deepEqual(resourcesToReferences([resource]), [
      { schema: 'NewPet', location: { file: 'src/a.ts', line: 4 } },
      { schema: 'Pet', location: { file: 'src/a.ts', line: 3 } },
    ])
  })

  it('references nothing for a body without a schema', () => {
    assert.deepEqual(resourcesToReferences([listing('src/a.ts', null)]), [])
  })
})
