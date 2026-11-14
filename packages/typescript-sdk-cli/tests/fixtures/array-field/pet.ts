import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  tags: string[]

  @BidirektField()
  scores: Array<number>

  @BidirektField()
  aliases: readonly string[]
}
