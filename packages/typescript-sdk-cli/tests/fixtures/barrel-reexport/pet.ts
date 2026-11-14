import { BidirektField, BidirektSchema } from './lib/contract.ts'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}
