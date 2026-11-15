/** @bidirekt schema name=PetStatus */
export enum Status {
  Available = 'available',
  Sold = 'sold',
}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 PetStatus
 * @bidirekt response 404
 */
export function findPet(): Status {
  return Status.Available
}

/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt response 201
 */
export const createCharge = async (): Promise<void> => {}
