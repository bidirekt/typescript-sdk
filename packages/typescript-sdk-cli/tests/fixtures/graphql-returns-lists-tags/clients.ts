/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}

/**
 * @bidirekt graphql consumes petstore_api query pets
 * @bidirekt returns Pet[]
 */
export function pets() {}

/**
 * @bidirekt graphql consumes petstore_api query maybePets
 * @bidirekt returns Pet[]?
 */
export function maybePets() {}

/**
 * @bidirekt graphql consumes petstore_api query sparsePets
 * @bidirekt returns Pet?[]
 */
export function sparsePets() {}

/**
 * @bidirekt graphql consumes petstore_api query anyPets
 * @bidirekt returns Pet?[]?
 */
export function anyPets() {}

/**
 * @bidirekt graphql consumes petstore_api query featuredPets
 * @bidirekt returns Pet?[] as FeaturedPets
 */
export function featuredPets() {}

/**
 * @bidirekt graphql consumes petstore_api query pet
 * @bidirekt returns Pet?
 */
export function pet() {}

/**
 * @bidirekt graphql consumes petstore_api mutation adoptPet
 * @bidirekt returns Pet?
 */
export function adopt() {}
