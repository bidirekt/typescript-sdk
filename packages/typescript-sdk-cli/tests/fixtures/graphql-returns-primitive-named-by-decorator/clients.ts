import { BidirektGraphqlConsumer } from '@bidirekt/typescript-sdk'

export class PetstoreClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    mutation: 'deletePet',
    returns: { type: 'boolean', name: 'Flag' },
  })
  deletePet() {}
}
