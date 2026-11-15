import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/** @bidirekt schema name=PetStatus */
export enum Status {
  Available = 'available',
  Sold = 'sold',
}

export enum Size {
  Small = 'small',
  Large = 'large',
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: Status

  @BidirektField()
  size: Size
}
