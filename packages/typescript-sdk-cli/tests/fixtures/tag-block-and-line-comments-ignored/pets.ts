import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/*
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {}

// @bidirekt rest provides GET /pets
// @bidirekt response 200 Pet
export function listPets() {}

/**
 * @bidirekt rest provides POST /pets
 * @bidirekt response 201 Pet
 */
export function createPet() {}
