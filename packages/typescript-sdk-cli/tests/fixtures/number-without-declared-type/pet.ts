import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  weight: number

  @BidirektField({ type: 'integer' })
  age: number

  @BidirektField({ type: 'float' })
  height: number
}
