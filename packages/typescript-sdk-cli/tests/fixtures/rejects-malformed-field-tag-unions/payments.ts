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
  /** @bidirekt field union=card:Card,pix:Pix */
  oldForm!: Card | Pix

  /** @bidirekt field union={card: Card, pix: Pix,} */
  trailingComma!: Card | Pix

  /** @bidirekt field union={} */
  emptyBraces!: Card | Pix

  /** @bidirekt field union={card Card, pix: Pix} */
  missingColon!: Card | Pix

  /** @bidirekt field union={card: Card, card: Pix} */
  repeatedKey!: Card | Pix

  /** @bidirekt field union={card: Card, pix: Pix */
  unclosedBrace!: Card | Pix

  /** @bidirekt field union=card: Card, pix: Pix} */
  unopenedBrace!: Card | Pix

  /** @bidirekt field union={card: Card, pix: Pix}} */
  extraClosingBrace!: Card | Pix

  /** @bidirekt field union={{card: Card, pix: Pix} */
  nestedBraces!: Card | Pix
}

/**
 * @bidirekt rest provides POST /orders
 * @bidirekt request NewOrder
 * @bidirekt response 201
 *
 * @bidirekt schema NewOrder
 * @bidirekt field payment union=card:Card,pix:Pix
 */
export function createOrder() {}
