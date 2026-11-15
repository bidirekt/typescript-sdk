import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'PetResponse' })
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 PetResponse
 * @bidirekt response 404
 */
export function findPet() {}

/**
 * @bidirekt provides GET /pets
 * @bidirekt response 200 PetResponse[]
 */
export function listPets() {}
