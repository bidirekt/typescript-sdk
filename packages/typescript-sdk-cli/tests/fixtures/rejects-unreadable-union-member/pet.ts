import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Order {
  // @ts-expect-error a union member is a schema, not a name
  @BidirektField({ union: { card: 'CardPayment' } })
  payment: unknown
}
