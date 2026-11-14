import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const SIZES = ['small', 'medium', 'large'] as const

const COLORS = { black: '#000', white: '#fff' }

@BidirektSchema()
export class Pet {
  @BidirektField()
  size: (typeof SIZES)[number]

  @BidirektField()
  color: keyof typeof COLORS
}
