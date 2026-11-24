/**
 * Finds a pet by its id.
 * @example findPet('42')
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200
 */
export function findPet(id: string) {
  return id
}

/**
 * Lists the pets.
 * @example
 *   listPets()
 * @bidirekt rest provides GET /pets
 * @bidirekt response 200
 */
export function listPets() {}
