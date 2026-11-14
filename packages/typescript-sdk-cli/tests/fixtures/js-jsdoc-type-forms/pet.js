/** @typedef {'small' | 'large'} Size */

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field
   *  @type {Size} */
  size

  /** @bidirekt field
   *  @type {import('./owner.js').Owner} */
  owner

  /** @bidirekt field
   *  @type {?string} */
  nickname

  /** @bidirekt field type=string
   *  @type {?string} */
  breed

  /** @bidirekt field
   *  @type {!string} */
  name
}
