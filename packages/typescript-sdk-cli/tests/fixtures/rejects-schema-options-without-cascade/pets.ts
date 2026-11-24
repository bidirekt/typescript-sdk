import {
  BidirektField,
  BidirektRestProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema({ nmae: 'PetResponse' })
export class Pet {
  @BidirektField()
  name: string
}

@BidirektSchema({ name: '' })
export class Owner {
  @BidirektField()
  pets: Pet[]
}

@BidirektSchema()
export class Visit {
  @BidirektField()
  owner: Owner
}

export class PetsController {
  @BidirektRestProvider({ method: 'GET', path: '/pets/*', responses: { 200: Pet } })
  find(): void {}

  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list(): void {}
}
