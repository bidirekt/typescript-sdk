import { BidirektField, BidirektProvider, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

export class Owner {
  name: string
}

export class PetsController {
  // @ts-expect-error a body is a schema class, not its name
  @BidirektProvider({ method: 'GET', path: '/pets/*', responses: { 200: 'Pet' } })
  find() {}

  // @ts-expect-error a list body holds one schema class
  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet, Pet] } })
  list() {}

  // @ts-expect-error a named list body declares its items in "list"
  @BidirektProvider({ method: 'GET', path: '/pets/featured', responses: { 200: { items: Pet, name: 'Featured' } } })
  featured() {}

  @BidirektProvider({ method: 'GET', path: '/pets/*/owner', responses: { 200: Owner } })
  owner() {}

  @BidirektProvider({ method: 'GET', path: '/pets/*/owners', responses: { 200: [Owner] } })
  owners() {}
}
