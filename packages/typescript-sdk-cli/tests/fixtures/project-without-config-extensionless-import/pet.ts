import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import { Owner } from './owner'

@BidirektSchema()
export class Pet {
  @BidirektField()
  owner!: Owner
}
