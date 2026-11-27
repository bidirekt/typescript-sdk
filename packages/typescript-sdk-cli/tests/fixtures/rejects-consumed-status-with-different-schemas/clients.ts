import {
  BidirektRestConsumer,
  BidirektField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Charge {
  @BidirektField()
  id: string
}

@BidirektSchema()
export class ChargeSummary {
  @BidirektField()
  amount: number
}

export class CheckoutClient {
  @BidirektRestConsumer({ provider: 'payments_api', method: 'GET', path: '/charges/*', responses: { 200: Charge } })
  find() {}
}

export class ReportClient {
  @BidirektRestConsumer({ provider: 'payments_api', method: 'GET', path: '/charges/*', responses: { 200: ChargeSummary } })
  summary() {}
}
