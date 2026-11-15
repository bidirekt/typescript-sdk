import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum PetStatus {
  Available = 'available',
  ForSale = 'available',
  Sold = 'sold',
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: PetStatus
}
