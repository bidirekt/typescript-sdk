import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import type { Owner } from './legacy.js'

@BidirektSchema()
export class Pet {
  @BidirektField()
  owner: Owner
}
