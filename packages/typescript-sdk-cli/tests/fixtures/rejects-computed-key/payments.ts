import {
  BidirektField,
  BidirektRestProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

enum HttpStatus {
  Ok = 200,
}

enum PaymentKind {
  Card = 'card',
}

declare function statusOf(name: string): number

@BidirektSchema()
export class Card {
  @BidirektField()
  number: string
}

@BidirektSchema()
export class Pix {
  @BidirektField()
  key: string
}

@BidirektSchema()
export class Order {
  @BidirektField({ union: { [PaymentKind.Card]: Card, pix: Pix } })
  payment: Card | Pix
}

export class PaymentsController {
  @BidirektRestProvider({
    method: 'GET',
    path: '/payments/*',
    responses: { [HttpStatus.Ok]: Card },
  })
  find(): void {}

  @BidirektRestProvider({
    method: 'GET',
    path: '/orders/*',
    responses: { [statusOf('ok')]: Order },
  })
  findOrder(): void {}
}
