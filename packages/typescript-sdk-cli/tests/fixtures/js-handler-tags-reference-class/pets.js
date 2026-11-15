/** @bidirekt schema name=PetResponse */
export class Pet {
  /** @bidirekt field type=integer */
  id

  /** @bidirekt field
   *  @type {string} */
  name
}

/** @bidirekt schema */
export class NewCharge {
  /** @bidirekt field type=integer */
  amount
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
export const listPets = () => []

/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt request NewCharge
 * @bidirekt response 201
 */
export const createCharge = (body) => body

const pet = new Pet()
pet.name = 'Rex'
findPet()
listPets()
createCharge(new NewCharge())
