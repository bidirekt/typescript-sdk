import {
  BidirektField,
  BidirektGraphqlConsumer,
  BidirektGraphqlField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class PetArgs {
  @BidirektField()
  id: string
}

@BidirektSchema()
export class AdoptArgs {
  @BidirektField()
  petId: string
}

@BidirektSchema()
export class ReviewsArgs {
  @BidirektField({ type: 'integer' })
  first: number
}

@BidirektSchema()
export class Review {
  @BidirektField({ type: 'integer' })
  stars: number
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string

  @BidirektField()
  status: 'AVAILABLE' | 'SOLD'

  @BidirektGraphqlField({ scalar: 'DateTime', optional: true })
  bornAt: string

  @BidirektGraphqlField({ arguments: ReviewsArgs })
  reviews: Review[]
}

export class PetstoreClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    mutation: 'adoptPet',
    arguments: AdoptArgs,
    returns: Pet,
  })
  adopt(input: AdoptArgs) {
    return input
  }

  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pets', returns: [Pet] })
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'petCount', returns: 'integer' })
  pets() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'pet',
    arguments: PetArgs,
    returns: { nullable: Pet, name: 'MaybePet' },
  })
  pet(id: string) {
    return id
  }
}
