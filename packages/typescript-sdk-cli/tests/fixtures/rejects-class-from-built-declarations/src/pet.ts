import {
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'
import { Card, Owner, Pix } from '@acme/dto'

@BidirektSchema()
export class Pet {
  @BidirektField()
  owner: Owner

  @BidirektField({ union: { card: Card, pix: Pix } })
  payment: Card | Pix
}

export class OwnersController {
  @BidirektProvider({
    method: 'GET',
    path: '/owners/*',
    responses: { 200: Owner },
  })
  find(): void {}
}
