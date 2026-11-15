/**
 * @bidirekt schema
 * @typedef {object} Address
 * @property {string} street
 */

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field
   *  @type {Address} */
  address
}

/**
 * @bidirekt schema name=Owner
 * @typedef {{ name: string }} OwnerShape
 */
export const owners = []
