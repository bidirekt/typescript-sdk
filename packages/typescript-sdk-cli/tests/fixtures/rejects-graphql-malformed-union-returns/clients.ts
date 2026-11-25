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
    query: 'featured',
    returns: { union: { Pet: Pet, Owner: Owner } },
  })
  featured() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'search',
    returns: { list: { union: { Pet: Pet, Owner: Owner } } },
  })
  search() {}
}
