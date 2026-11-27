import { BidirektRestConsumer } from '@bidirekt/typescript-sdk'

export class PaymentsClient {
  /**
   * @bidirekt rest consumes payments_api POST /charges
   * @bidirekt response 402
   */
  @BidirektRestConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    responses: { 201: null },
  })
  charge() {}
}
