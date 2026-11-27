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
export class Owner {
  @BidirektField()
  name: string
}

export class ShelterController {
  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 200: { list: Pet, name: 'Residents' } } })
  pets() {}

  @BidirektRestProvider({ method: 'GET', path: '/owners', responses: { 200: { list: Owner, name: 'Residents' } } })
  owners() {}
}
