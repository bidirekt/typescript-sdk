import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const isOptional = true

@BidirektSchema()
export class Pet {
  @BidirektField({ optional: isOptional })
  nickname: string
}
