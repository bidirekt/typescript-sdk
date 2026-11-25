/** @bidirekt schema */
export interface PetArgs {
  /** @bidirekt field */
  id: string
}

/** @bidirekt schema */
export interface AdoptArgs {
  /** @bidirekt field */
  petId: string
}

/** @bidirekt schema */
export interface ReviewsArgs {
  /** @bidirekt field type=integer */
  first: number
}

/** @bidirekt schema */
export interface Review {
  /** @bidirekt field type=integer */
  stars: number
}

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string

  /** @bidirekt field */
  status: 'AVAILABLE' | 'SOLD'

  /** @bidirekt graphql field scalar=DateTime */
  bornAt?: string

  /** @bidirekt graphql field arguments=ReviewsArgs */
  reviews: Review[]
}

/**
 * @bidirekt graphql consumes petstore_api mutation adoptPet
 * @bidirekt arguments AdoptArgs
 * @bidirekt returns Pet
 */
export function adopt(input: AdoptArgs) {
  return input
}

/**
 * @bidirekt graphql consumes petstore_api query pets
 * @bidirekt returns Pet[]
 */
export function pets() {}

/**
 * @bidirekt graphql consumes petstore_api query petCount
 * @bidirekt returns integer
 */
export function petCount() {}

/**
 * @bidirekt graphql consumes petstore_api query pet
 * @bidirekt arguments PetArgs
 * @bidirekt returns Pet? as MaybePet
 */
export function pet(id: string) {
  return id
}
