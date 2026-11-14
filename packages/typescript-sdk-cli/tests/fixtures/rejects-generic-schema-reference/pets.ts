/** @bidirekt schema */
export class Owner {
  /** @bidirekt field */
  name!: string
}

/** @bidirekt schema */
export class Page<T> {
  /** @bidirekt field */
  total!: number

  items!: Array<T>
}

/** @bidirekt schema */
export class Listing {
  /** @bidirekt field */
  owners!: Page<Owner>
}
