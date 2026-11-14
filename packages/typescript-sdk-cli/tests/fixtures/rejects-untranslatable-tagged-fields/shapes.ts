interface Shape {
  sides: number
}

class Page<T> {
  items: Array<T> = []
}

/** @bidirekt schema */
export class Drawing {
  /** @bidirekt field */
  shape: Shape

  /** @bidirekt field */
  page: Page<string>
}

/** @bidirekt schema */
export class Label {
  /** @bidirekt field */
  code!: string | number

  /** @bidirekt field */
  text = ''
}
