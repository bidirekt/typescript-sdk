/** @bidirekt schema */
export class Card {
  /** @bidirekt field */
  last4!: string
}

/** @bidirekt schema */
export class Pix {
  /** @bidirekt field */
  key!: string
}

/** @bidirekt schema */
export class Order {
  /** @bidirekt field union={card: Card[], pix: Pix} */
  payment!: Card | Pix
}

/**
 * @bidirekt provides GET /orders/*
 * @bidirekt response 200 Receipt
 *
 * @bidirekt schema Receipt
 * @bidirekt field payment union={card: map<Card>, pix: Pix}
 */
export function findOrder() {}
