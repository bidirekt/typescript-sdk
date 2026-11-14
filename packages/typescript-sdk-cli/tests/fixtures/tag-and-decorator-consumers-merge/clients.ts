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

export class PaymentsClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge },
  })
  charge() {}
}

/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt request NewCharge
 * @bidirekt response 201 Charge
 * @bidirekt response 402
 */
export const retryCharge = (body: NewCharge) => body
