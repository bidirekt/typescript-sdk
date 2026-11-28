import { BidirektGraphqlConsumer } from '@bidirekt/typescript-sdk'

export class PetstoreClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    mutation: 'deletePet',
    // @ts-expect-error a named primitive takes only type and name
    returns: { type: 'boolean', name: 'Flag', description: 'Deleted' },
  })
  deletePet() {}
}
