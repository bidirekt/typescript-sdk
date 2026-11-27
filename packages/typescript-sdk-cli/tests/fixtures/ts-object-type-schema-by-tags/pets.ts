/** @bidirekt schema name=PetCard */
export type Pet = {
  /** @bidirekt field */
  name: string

  /** @bidirekt field type=float */
  weight: number

  internalNotes: string
}

/** @bidirekt schema */
export type NewPet = {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Shelter {
  /** @bidirekt field */
  featured: Pet | null
}

/**
 * @bidirekt rest provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 PetCard
 */
export function createPet(pet: NewPet): Pet {
  return { ...pet, weight: 0, internalNotes: '' }
}
