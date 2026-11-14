/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}

export interface Pet {
  /** @bidirekt field */
  age: number
}

/** @bidirekt schema */
export interface Dog extends Pet {
  /** @bidirekt field */
  breed: string
}
