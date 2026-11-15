import {
  BidirektConsumer,
  BidirektField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Charge {
  @BidirektField()
  id: string
}

@BidirektSchema()
export class NewCharge {
  @BidirektField()
  amount: number
}

export class CheckoutClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge, 402: null },
  })
  charge() {}
}

export class RetryClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge, 409: null },
  })
  retry() {}
}
