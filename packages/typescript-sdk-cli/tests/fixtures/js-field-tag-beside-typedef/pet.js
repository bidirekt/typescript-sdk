/** @bidirekt schema */
export class Pet {
  /**
   * @bidirekt field type=string
   * @callback OnRename
   * @param {string} name
   */
  name

  /**
   * @typedef {'small' | 'large'} Size
   * @bidirekt field
   * @type {Size}
   */
  size

  /**
   * @typedef {import('./owner.js').Owner} PetOwner
   * @bidirekt field
   * @type {PetOwner}
   */
  owner
}
