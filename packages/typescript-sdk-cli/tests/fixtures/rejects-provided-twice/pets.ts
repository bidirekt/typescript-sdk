import {
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
  @BidirektRestProvider({ method: 'GET', path: '/pets/*', responses: { 200: Pet } })
  find() {}
}

export class LegacyPetsController {
  @BidirektRestProvider({ method: 'GET', path: '/pets/*', responses: { 200: Pet, 404: null } })
  find() {}
}
