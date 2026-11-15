import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ nullable: false })
  nickname: string | null

  @BidirektField({ optional: false })
  name?: string
}
