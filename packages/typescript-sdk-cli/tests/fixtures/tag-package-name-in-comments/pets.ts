import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/**
 * Declared with @bidirekt/typescript-sdk decorators.
 * @bidirekt/typescript-sdk reads them; install it with
 * `npm i @bidirekt/typescript-sdk`.
 * @see @bidirekt/typescript-sdk
 */
@BidirektSchema()
export class Pet {
  /** @see @bidirekt/typescript-sdk */
  @BidirektField()
  name: string
}
