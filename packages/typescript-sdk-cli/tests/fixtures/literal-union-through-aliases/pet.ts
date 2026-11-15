import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Available = 'available'
type Sold = 'sold'
type Pending = 'pending' | null

export enum PetStatus {
  Available = 'available',
  OnHold = 'on_hold',
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: Available | Sold

  @BidirektField()
  reportedStatus: PetStatus | 'unknown'

  @BidirektField()
  orderStatus: Pending | Sold
}
