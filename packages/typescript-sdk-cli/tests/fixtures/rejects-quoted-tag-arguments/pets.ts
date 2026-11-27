/**
 * @bidirekt rest provides GET "/pets/by name"
 * @bidirekt response 200
 */
export function findByName() {}

/** @bidirekt schema name="Pet Status" */
export enum Status {
  Available = 'available',
}

/** @bidirekt schema name="Size" */
export enum Size {
  Small = 'small',
}

/**
 * @bidirekt rest provides GET "/pets"
 * @bidirekt response 200
 */
export function listPets() {}

/**
 * @bidirekt rest consumes "payments_api" GET /charges
 * @bidirekt response 200
 */
export function listCharges() {}

/**
 * @bidirekt rest provides POST /pets
 * @bidirekt request "Status"
 * @bidirekt response 201 "Status"
 * @bidirekt response 200 Status[] as "Statuses"
 */
export function createPet() {}
