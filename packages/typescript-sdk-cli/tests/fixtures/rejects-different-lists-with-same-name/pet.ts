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
export class Owner {
  @BidirektField()
  name: string
}

export class ShelterController {
  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: { list: Pet, name: 'Residents' } } })
  pets() {}

  @BidirektProvider({ method: 'GET', path: '/owners', responses: { 200: { list: Owner, name: 'Residents' } } })
  owners() {}
}
