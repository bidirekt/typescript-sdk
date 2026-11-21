/** @bidirekt schema */
export class Card {
  /** @bidirekt field */
  last4!: string
}

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field name="petName" */
  name!: string

  /** @bidirekt field union={card: "Card"} */
  payment!: Card

  /** @bidirekt field description=the"tag */
  tag!: string

  /** @bidirekt field description="the age of the pet" */
  age!: number
}

/**
 * @bidirekt provides GET /health
 * @bidirekt response 200
 * @bidirekt schema "Health"
 * @bidirekt field status type=string
 */
export function health() {}

/**
 * @bidirekt provides GET /ready
 * @bidirekt response 200 Ready
 * @bidirekt schema Ready
 * @bidirekt field "status" type=string
 */
export function ready() {}

/** @bidirekt schema name="Owner" */
export class Owner {
  /** @bidirekt field */
  name!: string
}
