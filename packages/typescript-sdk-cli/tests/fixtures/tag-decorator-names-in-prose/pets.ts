import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/**
 * The pet the API returns.
 * @BidirektSchema names it in the contract, and
 * @BidirektField marks each field the contract carries.
 */
@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string

  /**
   * @BidirektRestProvider and @BidirektRestConsumer go on handler methods.
   * Kept out of the contract: it has no @BidirektField.
   */
  internalNotes!: string
}
