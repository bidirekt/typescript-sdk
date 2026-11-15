import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  nicknames: Array<string | undefined>

  @BidirektField()
  notes: Record<string, string | undefined>

  @BidirektField()
  tags: (string | undefined)[]
}
