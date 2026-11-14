import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ description: 'Shown on the card' })
  nickname: string

  /** The name the owner calls the pet */
  @BidirektField()
  name: string
}
