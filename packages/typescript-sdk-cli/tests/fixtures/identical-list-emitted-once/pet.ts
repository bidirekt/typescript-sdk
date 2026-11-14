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
  @BidirektProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured() {}
}

export class ShelterClient {
  @BidirektConsumer({
    provider: 'shelter_api',
    method: 'GET',
    path: '/residents',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  residents() {}
}
