import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export type Address = {
  street: string
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  address: Address
}
