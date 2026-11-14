import {
  BidirektConsumer,
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

export class PetsController {
  // @ts-expect-error the method is written in lowercase on purpose
  @BidirektProvider({ method: 'get', path: '/pets/*', responses: { 200: Pet } })
  find() {}
}

export class ShelterClient {
  @BidirektConsumer({
    provider: 'shelter_api',
    // @ts-expect-error the method is written in mixed case on purpose
    method: 'Post',
    path: '/pets',
    responses: { 201: Pet },
  })
  admit() {}
}
