/** @bidirekt schema */
export class Pet {
  /** @bidirekt field type=integer */
  id

  /** @bidirekt field
   *  @type {string} */
  name

  /** @bidirekt field name=birth_date
   *  @type {string | null} */
  birthDate

  /** @type {string} */
  internalNotes
}
