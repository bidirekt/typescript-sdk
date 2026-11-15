import {
  BidirektField,
  BidirektProvider,
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
  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list() {}
}
