import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export class Address {
  street: string
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  address: Address
}
