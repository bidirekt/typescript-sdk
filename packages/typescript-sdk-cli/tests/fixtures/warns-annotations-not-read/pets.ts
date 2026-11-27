import {
  BidirektField,
  BidirektRestProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string

  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 200: Pet } })
  owner: string

  @BidirektField
  tag: string
}

export class PetsController {
  @BidirektField()
  find() {}

  @BidirektSchema()
  list() {}
}

export function petField() {
  return BidirektField()
}

export const Shape = BidirektSchema
