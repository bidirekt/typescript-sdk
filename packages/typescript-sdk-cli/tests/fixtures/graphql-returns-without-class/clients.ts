import { BidirektGraphqlConsumer } from '@bidirekt/typescript-sdk'

export class PetstoreClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', mutation: 'deletePet', returns: 'boolean' })
  deletePet() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'tags', returns: 'string[]' })
  tags() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'now', returns: { scalar: 'DateTime' } })
  now() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'status',
    returns: { enum: ['AVAILABLE', 'SOLD'], name: 'Status' },
  })
  status() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'petCount', returns: { nullable: 'integer' } })
  petCount() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'visits',
    returns: { list: { scalar: 'DateTime' }, nullableItems: true },
  })
  visits() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'closedAt',
    returns: { nullable: { scalar: 'DateTime', name: 'Instant' } },
  })
  closedAt() {}
}
