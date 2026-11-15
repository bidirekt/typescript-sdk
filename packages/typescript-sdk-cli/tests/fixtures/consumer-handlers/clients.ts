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
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge, 402: null },
  })
  charge() {}

  @BidirektConsumer({ provider: 'payments_api', method: 'GET', path: '/charges', responses: { 200: [Charge] } })
  list() {}

  @BidirektConsumer({
    provider: 'payments_api',
    method: 'GET',
    path: '/charges/recent',
    responses: { 200: { list: Charge, name: 'ChargeCollection' } },
  })
  recent() {}

  @BidirektConsumer({ provider: 'payments_api', method: 'GET', path: '/charges/*/receipt', responses: { 200: Receipt } })
  receipt() {}

  @BidirektConsumer({
    provider: 'payments_api',
    method: 'PATCH',
    path: '/charges/*',
    request: null,
    responses: { 200: Charge, 404: null },
  })
  touch() {}
}

export class AuditClient {
  @BidirektConsumer({
    provider: 'audit_api',
    method: 'PUT',
    path: '/entries/*',
    request: AuditEntry,
    responses: { 204: null },
  })
  record() {}
}
