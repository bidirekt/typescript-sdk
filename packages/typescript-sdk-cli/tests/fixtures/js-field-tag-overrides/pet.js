/** @bidirekt schema name=PetCard */
export class Pet {
  /** @bidirekt field name=pet_name
   *  @type {string} */
  petName

  /** @bidirekt field type=float */
  weight

  /** @bidirekt field optional=true
   *  @type {string} */
  nickname

  /** @bidirekt field optional=false
   *  @type {string | undefined} */
  breed

  /** @bidirekt field nullable=true
   *  @type {boolean} */
  vaccinated

  /** @bidirekt field nullable=false
   *  @type {string | null} */
  color

  /** @bidirekt field description="Shown on the card"
   *  @type {string} */
  bio

  /** @bidirekt field
   *  @type {'small' | 'large'} */
  size

  /** @bidirekt field
   *  @type {Array<string>} */
  tags
}

/** @bidirekt schema */
export class Dog extends Pet {
  /** @bidirekt field type=integer
   *  @type {number | null} */
  age
}
