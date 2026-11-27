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
export class PetArgs {
  @BidirektField()
  id: string
}

@BidirektSchema()
export class PetByNameArgs {
  @BidirektField()
  name: string
}

export class ProfileClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', arguments: PetArgs, returns: { nullable: Pet, name: 'MaybePet' } })
  pet() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', mutation: 'adoptPet', returns: Pet })
  adopt() {}
}

export class SearchClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', arguments: PetByNameArgs, returns: Pet })
  pet() {}

  @BidirektGraphqlConsumer({ provider: 'petstore_api', mutation: 'adoptPet', arguments: PetArgs, returns: Pet })
  adopt() {}
}
