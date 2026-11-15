import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt provides GET /pets
 * @bidirekt response 200 Pet[]
 */
export function listPets() {}

/**
 * @bidirekt provides GET /pets/featured
 * @bidirekt response 200 Pet[] as PetCollection
 */
export function featuredPets() {}

/**
 * @bidirekt provides GET /pets/sold
 * @bidirekt response 200 Pet[]
 */
export function soldPets() {}
