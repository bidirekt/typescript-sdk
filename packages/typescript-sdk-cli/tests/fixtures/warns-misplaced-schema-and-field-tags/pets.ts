import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/** @bidirekt schema name=PetCard */
export const petCard = { name: 'Rex' }

/** @bidirekt field name=pet_name */
export function petName() {}

export class Owner {
  /** @bidirekt schema */
  name: string

  /** @bidirekt field */
  rename() {}
}

/** @bidirekt schema */
export type Status = 'available' | 'sold'
