/** @bidirekt schema */
export interface CardPayment {
  /** @bidirekt field */
  number: string
}

/** @bidirekt schema */
export interface PixPayment {
  /** @bidirekt field */
  key: string
}

/** @bidirekt schema */
export interface Order {
  /** @bidirekt field */
  payment: CardPayment | PixPayment
}
