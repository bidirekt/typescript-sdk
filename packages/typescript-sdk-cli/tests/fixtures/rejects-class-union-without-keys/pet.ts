import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class CardPayment {
  @BidirektField()
  last4: string
}

@BidirektSchema()
export class PixPayment {
  @BidirektField()
  key: string
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  payment: CardPayment | PixPayment
}
