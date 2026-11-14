import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ type: 'integer' })
  id

  /** @type {string | null} */
  @BidirektField()
  name
}
