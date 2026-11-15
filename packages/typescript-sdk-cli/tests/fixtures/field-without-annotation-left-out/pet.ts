import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  id: number

  @BidirektField()
  name: string

  internalNotes: string
}
