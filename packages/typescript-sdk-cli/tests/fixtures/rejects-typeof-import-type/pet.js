/** @bidirekt schema */
export class Pet {
  /** @bidirekt field
   *  @type {import('./owner.js').Owner} */
  owner

  /** @bidirekt field
   *  @type {typeof import('./owner.js').Owner} */
  ownerClass
}
