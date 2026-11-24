import {
  BidirektRestConsumer,
  BidirektField,
  BidirektRestProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

export class PetsController {
  @BidirektRestProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured() {}
}

export class ShelterClient {
  @BidirektRestConsumer({
    provider: 'shelter_api',
    method: 'GET',
    path: '/residents',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  residents() {}
}
