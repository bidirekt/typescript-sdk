import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum PetStatus {
  Available = 'available',
  OnHold = 'on_hold',
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: PetStatus

  @BidirektField()
  previousStatus: PetStatus | null
}
