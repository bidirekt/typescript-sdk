import type { Entity } from 'pet-entities'

/** @bidirekt schema */
export interface Pet extends Entity {
  /** @bidirekt field */
  name: string
}
