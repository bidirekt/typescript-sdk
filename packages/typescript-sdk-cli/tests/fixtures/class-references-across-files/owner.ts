import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Owner {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Address {
  @BidirektField()
  street: string
}
