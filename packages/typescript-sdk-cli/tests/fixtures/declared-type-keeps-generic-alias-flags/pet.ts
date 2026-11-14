import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Nullable<T> = T | null
type Maybe<T> = T | null | undefined

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
  @BidirektField({ type: 'string' })
  deletedAt: Nullable<Date>

  @BidirektField({ type: 'string' })
  bornAt: Maybe<Date>

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  payment: Nullable<CardPayment | PixPayment>
}
