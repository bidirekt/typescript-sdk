import { BidirektConsumer } from '@bidirekt/typescript-sdk'

export class PaymentsClient {
  /**
   * @bidirekt consumes payments_api POST /charges
   * @bidirekt response 402
   */
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    responses: { 201: null },
  })
  charge() {}
}
