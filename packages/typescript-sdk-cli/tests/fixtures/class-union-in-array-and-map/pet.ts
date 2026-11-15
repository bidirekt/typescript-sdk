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
  payments: Array<CardPayment | PixPayment>

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  byMethod: Record<string, CardPayment | PixPayment>

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  attempts?: Array<CardPayment | PixPayment | null> | null
}
