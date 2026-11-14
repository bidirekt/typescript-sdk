import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * Finds a pet.
 *
 * @request {string} id the pet id
 * @bidirekt provides GET /pets/*
 * @response 200 {Pet} the pet
 * @bidirekt response 200 Pet
 * @response 404 not found
 * @param id the pet id
 */
export function findPet(id: string) {
  return id
}
