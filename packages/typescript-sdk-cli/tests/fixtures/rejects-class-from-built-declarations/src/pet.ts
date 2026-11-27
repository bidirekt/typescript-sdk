import {
  BidirektField,
  BidirektRestProvider,
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
  @BidirektRestProvider({
    method: 'GET',
    path: '/owners/*',
    responses: { 200: Owner },
  })
  find(): void {}
}
