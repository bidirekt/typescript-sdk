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
export class NewCharge {
  @BidirektField()
  amount: number
}

@BidirektSchema()
export class Receipt {
  @BidirektField()
  id: string
}

@BidirektSchema()
export class AuditEntry {
  @BidirektField()
  message: string
}

export class PaymentsClient {
  @BidirektRestConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge, 402: null },
  })
  charge() {}

  @BidirektRestConsumer({ provider: 'payments_api', method: 'GET', path: '/charges', responses: { 200: [Charge] } })
  list() {}

  @BidirektRestConsumer({
    provider: 'payments_api',
    method: 'GET',
    path: '/charges/recent',
    responses: { 200: { list: Charge, name: 'ChargeCollection' } },
  })
  recent() {}

  @BidirektRestConsumer({ provider: 'payments_api', method: 'GET', path: '/charges/*/receipt', responses: { 200: Receipt } })
  receipt() {}

  @BidirektRestConsumer({
    provider: 'payments_api',
    method: 'PATCH',
    path: '/charges/*',
    request: null,
    responses: { 200: Charge, 404: null },
  })
  touch() {}
}

export class AuditClient {
  @BidirektRestConsumer({
    provider: 'audit_api',
    method: 'PUT',
    path: '/entries/*',
    request: AuditEntry,
    responses: { 204: null },
  })
  record() {}
}
