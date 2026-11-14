/** @bidirekt schema name=PetStatus */
export enum Status {
  Available = 'available',
  Sold = 'sold',
}

/**
 * @bidirekt provides GET /pets/status
 * @bidirekt response 200 PetStatus
 */
export function findStatus() {}
