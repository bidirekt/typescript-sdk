/** @typedef {{ street: string }} Street */

/** @bidirekt schema */
export class CardPayment {
  /** @bidirekt field type=string */
  number
}

/** @bidirekt schema */
export class PixPayment {
  /** @bidirekt field type=string */
  key
}

export class Address {}

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field */
  notes

  /** @bidirekt field
   *  @type {string | number} */
  code

  /** @bidirekt field
   *  @type {1 | 2} */
  rank

  /** @bidirekt field
   *  @type {CardPayment | PixPayment} */
  payment

  /** @bidirekt field
   *  @type {Address} */
  address

  /** @bidirekt field
   *  @type {{ street: string }} */
  location

  /** @bidirekt field
   *  @type {Date} */
  bornAt

  /** @bidirekt field
   *  @type {Street} */
  street

  /** @bidirekt field
   *  @type {Array<string | number>} */
  codes
}
