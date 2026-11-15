/** @bidirekt schema name=Animal */
/** @bidirekt schema name=Pet */
export class Pet {
  /** @bidirekt field name=nickname */
  /** @bidirekt field name=pet_name */
  name!: string
}

/** @bidirekt schema */
/** Stays the same. */
/** @bidirekt schema name=Toy */
export type Toy = {
  /** @bidirekt field */
  name: string
}
