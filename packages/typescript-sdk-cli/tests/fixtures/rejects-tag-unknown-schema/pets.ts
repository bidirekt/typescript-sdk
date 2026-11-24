import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'PetResponse' })
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {}

/**
 * @bidirekt rest provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 PetResponse
 */
export function createPet() {}

/**
 * @bidirekt rest provides GET /pets
 * @bidirekt response 200 Puppy[]
 */
export function listPets() {}
