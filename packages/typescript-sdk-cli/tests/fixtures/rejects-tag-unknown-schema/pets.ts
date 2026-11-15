import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'PetResponse' })
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {}

/**
 * @bidirekt provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 PetResponse
 */
export function createPet() {}

/**
 * @bidirekt provides GET /pets
 * @bidirekt response 200 Puppy[]
 */
export function listPets() {}
