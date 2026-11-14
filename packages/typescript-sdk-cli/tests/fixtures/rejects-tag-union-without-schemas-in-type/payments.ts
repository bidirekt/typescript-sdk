/** @bidirekt schema */
export interface Card {
  /** @bidirekt field */
  last4: string
}

/** @bidirekt schema */
export class Order {
  /** @bidirekt field union={card: Card} */
  label!: string
}
