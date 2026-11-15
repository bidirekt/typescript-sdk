import type { Entity } from '../packages/dto/dist/index.js'

/** @bidirekt schema */
export interface Pet extends Entity {
  /** @bidirekt field */
  name: string
}
