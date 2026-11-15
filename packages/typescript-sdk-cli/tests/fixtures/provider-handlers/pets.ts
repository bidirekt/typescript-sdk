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
  @BidirektProvider({
    method: 'GET',
    path: '/pets/*',
    responses: { 200: Pet, 404: null },
  })
  find() {}

  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list() {}

  @BidirektProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured() {}

  @BidirektProvider({ method: 'GET', path: '/pets/*/card', responses: { 200: PetCard } })
  card() {}

  @BidirektProvider({
    method: 'POST',
    path: '/pets',
    request: NewPet,
    responses: { 201: Pet, 400: null, 409: null },
  })
  create() {}

  @BidirektProvider({ method: 'PUT', path: '/pets/*', request: null, responses: { 204: null } })
  replace() {}
}
