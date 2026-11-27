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

export class PetstoreClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pets', returns: { list: Pet } })
  pets() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'maybePets', returns: { list: Pet, nullable: true } })
  maybePets() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'sparsePets', returns: { list: Pet, nullableItems: true } })
  sparsePets() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'anyPets',
    returns: { list: Pet, nullable: true, nullableItems: true },
  })
  anyPets() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'featuredPets',
    returns: { list: Pet, nullableItems: true, name: 'FeaturedPets' },
  })
  featuredPets() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', returns: { nullable: Pet } })
  pet() {}
}

export class AdoptionClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', mutation: 'adoptPet', returns: { nullable: Pet } })
  adopt() {}
}
