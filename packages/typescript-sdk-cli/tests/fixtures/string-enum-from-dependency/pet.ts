import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import type { PetSize, PetStatus } from 'pet-statuses'

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: PetStatus

  @BidirektField()
  size: PetSize
}
