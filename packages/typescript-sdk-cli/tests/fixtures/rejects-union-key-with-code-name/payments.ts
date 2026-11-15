/** @bidirekt schema */
export class Card {
  /** @bidirekt field */
  last4!: string
}

/** @bidirekt schema name=Pix */
export class PixPayment {
  /** @bidirekt field */
  key!: string
}

/** @bidirekt schema */
export class Order {
  /** @bidirekt field union={card: Card, pix: PixPayment} */
  payment!: Card | PixPayment
}

/** @bidirekt schema */
export class Refund {
  /** @bidirekt field union={card: Card, pix: Boleto} */
  payment!: Card | PixPayment
}
