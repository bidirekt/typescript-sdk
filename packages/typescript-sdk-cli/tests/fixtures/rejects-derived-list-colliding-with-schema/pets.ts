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

@BidirektSchema()
export class PetList {
  @BidirektField()
  total: number
}

export class PetsController {
  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list() {}
}
