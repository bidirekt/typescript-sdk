/**
 * @typedef {import('./owner.js').Owner} PetOwner
 * @bidirekt schema
 */
export class Pet {
  /** @bidirekt field
   *  @type {PetOwner} */
  owner
}

/**
 * @bidirekt schema
 * @callback Feed
 * @param {string} food
 */
export const feed = (food) => food
