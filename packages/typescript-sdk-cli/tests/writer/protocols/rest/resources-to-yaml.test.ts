import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Document } from 'yaml'
import type { SourceLocation } from '../../../../src/model/contract.ts'
import type { Resource } from '../../../../src/model/protocols/rest/contract.ts'
import { resourcesToYaml } from '../../../../src/writer/protocols/rest/resources-to-yaml.ts'

const at: SourceLocation = { file: 'src/pets.ts', line: 1 }

function resources(): Array<Resource> {
  return [
    {
      method: 'POST',
      path: '/pets',
      request: { schema: 'NewPet', location: at },
      responses: [
        { status: 400, schema: null, location: at },
        { status: 201, schema: 'Pet', location: at },
      ],
      location: at,
    },
    {
      method: 'GET',
      path: '/pets/*',
      responses: [
        { status: 404, schema: null, location: at },
        { status: 200, schema: 'Pet', location: at },
      ],
      location: at,
    },
    {
      method: 'GET',
      path: '/pets',
      responses: [{ status: 200, schema: 'PetList', location: at }],
      location: at,
    },
    {
      method: 'DELETE',
      path: '/pets/*',
      request: { schema: null, location: at },
      responses: [{ status: 204, schema: null, location: at }],
      location: at,
    },
  ]
}

const resourcesYaml = `/pets:
  get:
    responses:
      200: PetList
  post:
    request: NewPet
    responses:
      201: Pet
      400: ~
/pets/*:
  delete:
    request: ~
    responses:
      204: ~
  get:
    responses:
      200: Pet
      404: ~
`

function resourcesToText(written: Array<Resource>): string {
  return new Document(resourcesToYaml(written)).toString({ nullStr: '~' })
}

describe('resourcesToYaml', () => {
  it('writes each resource by path, method and status', () => {
    assert.equal(resourcesToText(resources()), resourcesYaml)
  })

  it('writes the same text when resources and statuses arrive in another order', () => {
    const reversed = resources()
      .map((resource) => ({
        ...resource,
        responses: [...resource.responses].reverse(),
      }))
      .reverse()
    assert.equal(resourcesToText(reversed), resourcesYaml)
  })

  it('omits the request key when none was declared', () => {
    const written = resourcesToText([
      {
        method: 'GET',
        path: '/charges/*',
        responses: [{ status: 200, schema: null, location: at }],
        location: at,
      },
    ])
    assert.equal(
      written,
      `/charges/*:
  get:
    responses:
      200: ~
`,
    )
  })
})
