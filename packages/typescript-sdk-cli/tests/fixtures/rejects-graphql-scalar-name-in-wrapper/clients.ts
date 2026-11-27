import { BidirektGraphqlConsumer } from '@bidirekt/typescript-sdk'

export class PetstoreClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'closedAt',
    // @ts-expect-error the name of a scalar in a nullable goes on the nullable
    returns: { nullable: { scalar: 'DateTime', name: 'Instant' } },
  })
  closedAt() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'visits',
    // @ts-expect-error the name of a scalar in a list goes on the list
    returns: { list: { scalar: 'DateTime', name: 'Instant' } },
  })
  visits() {}
}
