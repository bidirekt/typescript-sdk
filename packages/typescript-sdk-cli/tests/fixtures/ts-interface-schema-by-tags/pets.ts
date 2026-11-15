import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema name=PetResponse */
export interface Pet {
  /** @bidirekt field type=integer */
  id: number

  /** @bidirekt field name=birth_date */
  birthDate?: string | null

  /** @bidirekt field */
  owner: Owner

  /** @bidirekt field */
  previousOwners: Owner[]

  internalNotes: string
}

/** @bidirekt schema */
export interface Dog extends Pet {
  /** @bidirekt field */
  breed: string
}

@BidirektSchema()
export class Shelter {
  @BidirektField()
  keeper: Owner
}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 PetResponse
 * @bidirekt response 404
 */
export function findPet(id: string): Pet | undefined {
  return undefined && id
}

/**
 * @bidirekt provides GET /dogs
 * @bidirekt response 200 Dog[]
 */
export function listDogs(): Array<Dog> {
  return []
}
