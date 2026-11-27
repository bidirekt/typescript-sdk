/** @bidirekt schema */
export class Pet {
  /** @bidirekt field description="The pet's age, in years." */
  age!: number
}

/**
 * @bidirekt rest provides GET /health
 * @bidirekt response 200 Health
 * @bidirekt schema Health
 * @bidirekt field status type=string description="Shown on the status page."
 */
export function health() {}
