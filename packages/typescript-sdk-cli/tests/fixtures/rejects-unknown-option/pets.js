import {
  BidirektConsumer,
  BidirektField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema({ nmae: 'Animal' })
export class Owner {}

@BidirektSchema()
export class Pet {
  /** @type {string | null} */
  @BidirektField({ nulable: false })
  name
}

export class PaymentsClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    requst: Pet,
    responses: { 201: null },
  })
  charge() {}
}
