export class Animal {
  /** @bidirekt field */
  name!: string
}

/** @bidirekt schema */
export class Pet extends Animal {
  /** @bidirekt field */
  breed!: string
}

/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field */
  name: string
}

export interface Owner {
  /** @bidirekt field */
  email: string
}

export class Shelter {
  /** @bidirekt field */
  city!: string
}

export interface Vet {
  /** @bidirekt field */
  clinic: string
}

export type Toy = {
  /** @bidirekt field */
  color: string
}

export const visit: {
  /** @bidirekt field */
  day: string
} = { day: 'monday' }
