/** @bidirekt schema */
export interface Card {
  /** @bidirekt field */
  last4: string
}

/** @bidirekt schema */
export type Pix = {
  /** @bidirekt field */
  key: string
}

/** @bidirekt schema */
export class Order {
  /** @bidirekt field union={card: Card, pix: Pix} */
  history!: Array<Card | Pix>

  /** @bidirekt field union={card:Card,pix:Pix} */
  byId!: Record<string, Card | Pix | null>
}
