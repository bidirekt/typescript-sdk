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
export class NewPet {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class PetCard {
  @BidirektField()
  name: string
}

export class PetsController {
  @BidirektRestProvider({
    method: 'GET',
    path: '/pets/*',
    responses: { 200: Pet, 404: null },
  })
  find() {}

  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list() {}

  @BidirektRestProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured() {}

  @BidirektRestProvider({ method: 'GET', path: '/pets/*/card', responses: { 200: PetCard } })
  card() {}

  @BidirektRestProvider({
    method: 'POST',
    path: '/pets',
    request: NewPet,
    responses: { 201: Pet, 400: null, 409: null },
  })
  create() {}

  @BidirektRestProvider({ method: 'PUT', path: '/pets/*', request: null, responses: { 204: null } })
  replace() {}
}
