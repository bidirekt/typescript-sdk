import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  Resource,
  Response,
} from '../../../../src/model/protocols/rest/contract.ts'
import {
  consumedToMerged,
  providedToMerged,
  sideBlocksToMerged,
} from '../../../../src/model/protocols/rest/resources-to-merged.ts'

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
): Resource {
  const resource: Resource = {
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

function pets(line: number): Resource {
  return {
    method: 'GET',
    path: '/pets',
    responses: [],
    location: { file: 'src/pets.ts', line },
  }
}

describe('sideBlocksToMerged', () => {
  it('merges the blocks consumed from a provider as consumed resources', () => {
    const merged = sideBlocksToMerged([
      {
        provider: 'payments_api',
        block: [charges(1, [response(201, 'Charge', 2)])],
      },
      {
        provider: 'payments_api',
        block: [charges(10, [response(402, null, 11)])],
      },
    ])
    assert.deepEqual(merged, {
      block: [
        charges(1, [response(201, 'Charge', 2), response(402, null, 11)]),
      ],
      errors: [],
    })
  })

  it('merges the blocks of the provided side as provided resources', () => {
    const merged = sideBlocksToMerged([
      { block: [pets(1)] },
      { block: [pets(10)] },
    ])
    const message =
      '"GET /pets" is provided by more than one handler: declare each method and path in one handler'
    assert.deepEqual(merged, {
      block: [pets(1)],
      errors: [
        { message, location: { file: 'src/pets.ts', line: 1 } },
        { message, location: { file: 'src/pets.ts', line: 10 } },
      ],
    })
  })
})

describe('consumedToMerged', () => {
  it('merges the statuses of handlers that consume the same resource', () => {
    const { block, errors } = consumedToMerged(
      [
        charges(1, [response(201, 'Charge', 2), response(402, null, 3)]),
        charges(10, [response(201, 'Charge', 11), response(409, null, 12)]),
      ],
      'payments_api',
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(block, [
      charges(1, [
        response(201, 'Charge', 2),
        response(402, null, 3),
        response(409, null, 12),
      ]),
    ])
  })

  it('rejects the same status with different schemas at both places', () => {
    const { errors } = consumedToMerged(
      [
        charges(1, [response(201, 'Charge', 2)]),
        charges(10, [response(201, null, 11)]),
      ],
      'payments_api',
    )
    const message =
      'response 201 of "POST /charges" consumed from "payments_api" is declared as "Charge" and null: declare one schema with every field the service reads'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/client.ts', line: 2 } },
      { message, location: { file: 'src/client.ts', line: 11 } },
    ])
  })

  it('rejects requests with different schemas at both places', () => {
    const { errors } = consumedToMerged(
      [charges(1, [], 'NewCharge'), charges(10, [], null)],
      'payments_api',
    )
    const message =
      'request of "POST /charges" consumed from "payments_api" is declared as "NewCharge" and null: declare the same request in every handler'
    assert.deepEqual(errors, [
      { message, location: { file: 'src/client.ts', line: 2 } },
      { message, location: { file: 'src/client.ts', line: 11 } },
    ])
  })

  it('rejects a request declared in one handler only at both places', () => {
    const { errors } = consumedToMerged(
      [charges(1, []), charges(10, [], 'NewCharge')],
      'payments_api',
    )
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
