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
export class Order {
  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  payment: CardPayment | PixPayment

  @BidirektField({ union: { pix: PixPayment, card: CardPayment } })
  refund?: CardPayment | PixPayment | null
}
