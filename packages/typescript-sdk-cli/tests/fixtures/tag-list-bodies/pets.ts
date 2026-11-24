import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides GET /pets
 * @bidirekt response 200 Pet[]
 */
export function listPets() {}

/**
 * @bidirekt rest provides GET /pets/featured
 * @bidirekt response 200 Pet[] as PetCollection
 */
export function featuredPets() {}

/**
 * @bidirekt rest provides GET /pets/sold
 * @bidirekt response 200 Pet[]
 */
export function soldPets() {}
