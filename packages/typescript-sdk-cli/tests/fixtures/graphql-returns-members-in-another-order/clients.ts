import {
  BidirektField,
  BidirektGraphqlConsumer,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Owner {
  @BidirektField()
  email: string
}

export class SearchClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'search',
    returns: { list: { union: { Pet: Pet, Owner: Owner }, name: 'SearchResult' } },
  })
  search() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'featured',
    returns: { union: { Owner: Owner, Pet: Pet }, name: 'SearchResult' },
  })
  featured() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'status',
    returns: { nullable: { enum: ['AVAILABLE', 'SOLD'], name: 'Status' } },
  })
  status() {}
}
