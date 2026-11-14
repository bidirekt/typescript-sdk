/** @bidirekt schema */
export class CardPayment {
  /** @bidirekt field
   *  @type {string} */
  last4
}

/** @bidirekt schema name=Pix */
export class PixPayment {
  /** @bidirekt field
   *  @type {string} */
  key
}

/** @bidirekt schema */
export class Order {
  /** @bidirekt field union={card: CardPayment, pix: Pix}
   *  @type {CardPayment | PixPayment | null} */
  payment

  /** @bidirekt field union={card:CardPayment} optional=true */
  refund
}
