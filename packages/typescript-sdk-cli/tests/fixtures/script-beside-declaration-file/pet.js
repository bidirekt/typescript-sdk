import { Owner } from './owner.js'

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field
   *  @type {string} */
  name

  /** @bidirekt field
   *  @type {Owner} */
  owner
}
