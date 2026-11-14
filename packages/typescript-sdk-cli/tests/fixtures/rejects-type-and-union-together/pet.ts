import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class CardPayment {
  @BidirektField()
  last4: string
}

@BidirektSchema()
export class Order {
  @BidirektField({ type: 'string', union: { card: CardPayment } })
  payment: CardPayment
}
