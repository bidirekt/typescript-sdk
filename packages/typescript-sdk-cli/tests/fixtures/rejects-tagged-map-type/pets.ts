/** @bidirekt schema */
export type Labels = { [key: string]: string }

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field */
  labels!: Labels
}
