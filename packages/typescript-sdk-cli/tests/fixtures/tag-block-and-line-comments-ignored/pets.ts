import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/*
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {}

// @bidirekt provides GET /pets
// @bidirekt response 200 Pet
export function listPets() {}

/**
 * @bidirekt provides POST /pets
 * @bidirekt response 201 Pet
 */
export function createPet() {}
