import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum PaymentType {
  Card = 'card',
  Pix = 'pix',
}

@BidirektSchema()
export class CardPayment {
  @BidirektField()
  kind: PaymentType.Card

  @BidirektField()
  previousKind: PaymentType.Card | PaymentType.Pix | null
}
