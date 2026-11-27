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
    returns: { union: { Pet: Pet, Owner: Owner }, name: 'SearchResult' },
  })
  featured() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'lookup',
    returns: { nullable: { union: { Pet: Pet, Owner: Owner }, name: 'SearchResult' } },
  })
  lookup() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'recent',
    returns: { list: { union: { Pet: Pet, Owner: Owner }, name: 'SearchResult' }, nullable: true },
  })
  recent() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'history',
    returns: { list: { union: { Pet: Pet, Owner: Owner }, name: 'SearchResult' }, nullableItems: true },
  })
  history() {}
}
