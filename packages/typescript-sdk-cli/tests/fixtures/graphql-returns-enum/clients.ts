import { BidirektGraphqlConsumer } from '@bidirekt/typescript-sdk'

export class PetstoreClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'status',
    returns: { nullable: { enum: ['AVAILABLE', 'SOLD'], name: 'Status' } },
  })
  status() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'statuses',
    returns: { list: { enum: ['AVAILABLE', 'SOLD'], name: 'Status' } },
  })
  statuses() {}
}
