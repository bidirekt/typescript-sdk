/** @bidirekt schema */
export class Card {
  /** @bidirekt field
   *  @type {string} */
  number
}

/** @bidirekt schema */
export class Pix {
  /** @bidirekt field
   *  @type {string} */
  key
}

/** @bidirekt schema */
export class Boleto {
  /** @bidirekt field
   *  @type {string} */
  code
}

/** @bidirekt schema */
export class Order {
  /** @bidirekt field union={card: Card, boleto: Boleto}
   *  @type {Card | Pix} */
  payment

  /** @bidirekt field union={card: Card}
   *  @type {Card | Pix} */
  refund

  /** @bidirekt field union={card: Card, pix: Pix, again: Pix}
   *  @type {Card | Pix} */
  retry
}
