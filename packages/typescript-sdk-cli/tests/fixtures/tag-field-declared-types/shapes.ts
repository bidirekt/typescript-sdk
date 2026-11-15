/** @bidirekt schema */
export interface Shape {
  /** @bidirekt field type=integer[] */
  sides: number[]

  /** @bidirekt field type=map<integer>[] */
  corners?: Array<Record<string, number>>
}
