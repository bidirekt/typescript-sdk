import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Card {
  @BidirektField()
  last4: string
}

@BidirektSchema()
export class Pix {
  @BidirektField()
  key: string
}

@BidirektSchema()
export class Boleto {
  @BidirektField()
  barcode: string
}

@BidirektSchema()
export class Order {
  @BidirektField({ union: { card: Card, pix: Pix, boleto: Boleto } })
  payment: Card | Pix

  @BidirektField({ union: { card: Card } })
  refund: Card | Pix | null

  @BidirektField({ union: { card: Card, credit: Card, pix: Pix } })
  deposit: Card | Pix

  @BidirektField({ union: { card: Card } })
  attempts: Array<Card | Pix>
}
