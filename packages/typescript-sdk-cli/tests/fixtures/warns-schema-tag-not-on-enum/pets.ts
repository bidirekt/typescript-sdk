import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/** @bidirekt schema name=PetCard */
export const petCard = { name: 'Rex' }
