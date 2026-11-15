import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import { Address, Owner } from './owner.ts'
import * as owners from './owner.ts'

@BidirektSchema()
export class PetCard {
  @BidirektField()
  owner: Owner

  @BidirektField()
  formerOwners: owners.Owner[]

  @BidirektField()
  address: Address
}
