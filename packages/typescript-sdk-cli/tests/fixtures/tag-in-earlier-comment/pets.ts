import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 */
/** Finds a pet by its id. */
export function findPet(id: string) {
  return id
}

/** @bidirekt schema name=PetStatus */
/** The statuses a pet goes through. */
export enum Status {
  Available = 'available',
}

@BidirektSchema()
export class Listing {
  @BidirektField()
  status: Status
}
