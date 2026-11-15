import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/** @bidirekt schema */
@BidirektSchema()
export class Pet {
  /** @bidirekt field */
  @BidirektField()
  name: string
}
