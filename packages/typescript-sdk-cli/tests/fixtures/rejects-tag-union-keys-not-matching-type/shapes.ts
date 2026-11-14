import type { Card, Pix } from './payments.js'

/** @bidirekt schema */
export interface Receipt {
  /** @bidirekt field union={card: Card, boleto: Boleto} */
  payment: Card | Pix
}

/** @bidirekt schema */
export interface CardInfo {
  /** @bidirekt field */
  number: string
}

/** @bidirekt schema */
export interface PixInfo {
  /** @bidirekt field */
  key: string
}

/** @bidirekt schema */
export interface Invoice {
  /** @bidirekt field union={card: CardInfo} */
  payments: Array<CardInfo | PixInfo>
}
