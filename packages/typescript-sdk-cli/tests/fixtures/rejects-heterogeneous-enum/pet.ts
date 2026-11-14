import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum Status {
  Active = 'active',
  Retired = 0,
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: Status
}
