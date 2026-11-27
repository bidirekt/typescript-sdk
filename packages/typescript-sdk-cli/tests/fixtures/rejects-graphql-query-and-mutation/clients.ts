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
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', mutation: 'adoptPet', returns: Pet })
  pet() {}
}
