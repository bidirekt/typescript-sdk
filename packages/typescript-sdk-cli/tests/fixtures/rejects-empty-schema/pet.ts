import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Empty {}

@BidirektSchema()
export class Pet {
  name: string
}

@BidirektSchema()
export class Owner {
  @BidirektField()
  name: string
}
