import {
  BidirektRestConsumer,
  BidirektField,
  BidirektRestProvider,
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
  @BidirektRestProvider(findOptions)
  find() {}

  @BidirektRestProvider({ method: listMethod, path: '/pets', responses: { 200: Pet } })
  list() {}

  @BidirektRestProvider({ method: 'POST', path: '/pets', responses: createResponses })
  create() {}

  // @ts-expect-error the status is not a number on purpose
  @BidirektRestProvider({ method: 'DELETE', path: '/pets/*', responses: { gone: null } })
  remove() {}
}

export class ShelterClient {
  // @ts-expect-error the provider is left out on purpose
  @BidirektRestConsumer({ method: 'GET', path: '/residents', responses: { 200: Pet } })
  residents() {}
}
