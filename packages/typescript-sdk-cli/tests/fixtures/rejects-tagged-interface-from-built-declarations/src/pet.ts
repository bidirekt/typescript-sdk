import type { Entity, Owner } from '@acme/dto'

/** @bidirekt schema */
export interface Pet extends Entity {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Visit {
  /** @bidirekt field */
  pet: Entity
  /** @bidirekt field */
  owner: Owner
}
