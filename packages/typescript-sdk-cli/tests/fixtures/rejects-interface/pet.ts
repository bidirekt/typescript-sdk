import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export interface Address {
  street: string
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  address: Address
}
