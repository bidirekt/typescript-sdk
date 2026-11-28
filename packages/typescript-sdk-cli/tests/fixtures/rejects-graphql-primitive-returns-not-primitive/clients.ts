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
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'tags',
    // @ts-expect-error a list is not a primitive
    returns: { type: 'string[]', name: 'Tags' },
  })
  tags() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'pet',
    // @ts-expect-error a schema is not a primitive
    returns: { type: Pet, name: 'MyPet' },
  })
  pet() {}
}
