import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/**
 * The pet the API returns, checked by @bidirekt tooling.
 * @remarks Kept in sync by @bidirekt tooling.
 */
@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string
}

/** Lists the pets. @bidirekt rest provides GET /pets */
export function listPets() {}

/**
 * Finds a pet. @bidirekt rest provides GET /pets/*
 * It answers 200. @bidirekt response 200
 */
export function findPet() {}
