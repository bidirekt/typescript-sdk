import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ description: "The pet's age, in years." })
  age: number

  @BidirektField({ description: '' })
  name: string
}
