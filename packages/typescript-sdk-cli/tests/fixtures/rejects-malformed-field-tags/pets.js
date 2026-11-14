/** @bidirekt schema Pet */
export class Pet {}

/** @bidirekt schema */
export default class {}

/** @bidirekt schema */
export class Dog {
  /** @bidirekt field kind=integer */
  id

  /** @bidirekt field integer */
  age

  /** @bidirekt field type=map<integer */
  bornAt

  /** @bidirekt field optional=yes */
  nickname

  /** @bidirekt field nullable=1 */
  color

  /** @bidirekt field name= */
  breed

  /** @bidirekt field description="" */
  bio

  /** @bidirekt field union=card */
  payment

  /** @bidirekt field union={card: CardPayment, card: PixPayment} */
  refund

  /** @bidirekt field name=a name=b */
  tag

  /** @bidirekt field type=integer union={card: CardPayment} */
  owner

  /**
   * @bidirekt field
   * @bidirekt field name=size_name
   * @type {string}
   */
  size

  /** @bidirekt field union={card: Card} */
  coupon

  /** @bidirekt field */
  notes
}
