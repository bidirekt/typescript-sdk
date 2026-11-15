import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const nameKey = 'name'

@BidirektSchema()
export class Pet {
  @BidirektField()
  [nameKey]: string
}
