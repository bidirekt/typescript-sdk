import {
  BidirektConsumer,
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

const findOptions = { method: 'GET', path: '/pets/*', responses: { 200: Pet } } as const
const listMethod = 'GET'
const createResponses = { 201: Pet }

export class PetsController {
  @BidirektProvider(findOptions)
  find() {}

  @BidirektProvider({ method: listMethod, path: '/pets', responses: { 200: Pet } })
  list() {}

  @BidirektProvider({ method: 'POST', path: '/pets', responses: createResponses })
  create() {}

  // @ts-expect-error the status is not a number on purpose
  @BidirektProvider({ method: 'DELETE', path: '/pets/*', responses: { gone: null } })
  remove() {}
}

export class ShelterClient {
  // @ts-expect-error the provider is left out on purpose
  @BidirektConsumer({ method: 'GET', path: '/residents', responses: { 200: Pet } })
  residents() {}
}
