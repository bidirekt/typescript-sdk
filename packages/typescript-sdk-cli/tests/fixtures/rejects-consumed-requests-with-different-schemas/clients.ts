import {
  BidirektRestConsumer,
  BidirektField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class NewCharge {
  @BidirektField()
  amount: number
}

@BidirektSchema()
export class RetriedCharge {
  @BidirektField()
  chargeId: string
}

export class CheckoutClient {
  @BidirektRestConsumer({ provider: 'payments_api', method: 'POST', path: '/charges', request: NewCharge, responses: { 201: null } })
  charge() {}
}

export class RetryClient {
  @BidirektRestConsumer({ provider: 'payments_api', method: 'POST', path: '/charges', request: RetriedCharge, responses: { 201: null } })
  retry() {}
}
