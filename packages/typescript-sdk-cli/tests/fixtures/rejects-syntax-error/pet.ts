import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string

  @BidirektField()
  broken!:

  @BidirektField()
  age!: number
}
