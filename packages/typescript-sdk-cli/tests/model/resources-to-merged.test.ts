import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  ConsumedResource,
  ProvidedResource,
  Response,
} from '../../src/model/contract.ts'
import {
  consumedToMerged,
  providedToMerged,
} from '../../src/model/resources-to-merged.ts'

function response(
  status: number,
  schema: string | null,
  line: number,
): Response {
  return { status, schema, location: { file: 'src/client.ts', line } }
}

function charges(
  line: number,
  responses: Array<Response>,
  request?: string | null,
): ConsumedResource {
  const resource: ConsumedResource = {
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    responses,
    location: { file: 'src/client.ts', line },
  }
  if (request !== undefined) {
    resource.request = {
      schema: request,
      location: { file: 'src/client.ts', line: line + 1 },
    }
  }
  return resource
}

function pets(line: number): ProvidedResource {
  return {
    method: 'GET',
    path: '/pets',
    responses: [],
    location: { file: 'src/pets.ts', line },
  }
}

describe('consumedToMerged', () => {
  it('merges the statuses of handlers that consume the same resource', () => {
    const { resources, errors } = consumedToMerged([
      charges(1, [response(201, 'Charge', 2), response(402, null, 3)]),
      charges(10, [response(201, 'Charge', 11), response(409, null, 12)]),
    ])
    assert.deepEqual(errors, [])
    assert.deepEqual(resources, [
      charges(1, [
        response(201, 'Charge', 2),
        response(402, null, 3),
        response(409, null, 12),
      ]),
    ])
  })

  it('keeps resources of different providers apart', () => {
    const other = { ...charges(10, []), provider: 'billing_api' }
    const { resources, errors } = consumedToMerged([charges(1, []), other])
    assert.deepEqual(errors, [])
    assert.deepEqual(resources, [charges(1, []), other])
  })

  it('rejects the same status with different schemas at both places', () => {
    const { errors } = consumedToMerged([
      charges(1, [response(201, 'Charge', 2)]),
      charges(10, [response(201, null, 11)]),
    ])
    const message =
      'response 201 of "POST /charges" consumed from "payments_api" is declared as "Charge" and null: declare one schema with every field the service reads'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/client.ts', line: 2 } },
      { message, location: { file: 'src/client.ts', line: 11 } },
    ])
  })

  it('rejects requests with different schemas at both places', () => {
    const { errors } = consumedToMerged([
      charges(1, [], 'NewCharge'),
      charges(10, [], null),
    ])
    const message =
      'request of "POST /charges" consumed from "payments_api" is declared as "NewCharge" and null: declare the same request in every handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/client.ts', line: 2 } },
      { message, location: { file: 'src/client.ts', line: 11 } },
    ])
  })

  it('rejects a request declared in one handler only at both places', () => {
    const { errors } = consumedToMerged([
      charges(1, []),
      charges(10, [], 'NewCharge'),
    ])
    const message =
      'request of "POST /charges" consumed from "payments_api" is declared in one handler and not in another: declare the same request in every handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/client.ts', line: 1 } },
      { message, location: { file: 'src/client.ts', line: 11 } },
    ])
  })
})

describe('providedToMerged', () => {
  it('rejects the same method and path in two handlers at both places', () => {
    const { errors } = providedToMerged([pets(1), pets(10)])
    const message =
      '"GET /pets" is provided by more than one handler: declare each method and path in one handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/pets.ts', line: 1 } },
      { message, location: { file: 'src/pets.ts', line: 10 } },
    ])
  })
})
