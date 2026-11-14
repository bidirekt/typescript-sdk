import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ type: 'string' })
  birthDate: Date | null

  @BidirektField({ type: 'string', description: 'ISO 8601' })
  adoptedAt?: Date

  @BidirektField({ type: 'integer[]' })
  scores: number[]

  @BidirektField({ type: 'integer[][]' })
  grid: number[][]

  @BidirektField({ type: 'map<float>' })
  weights: Record<string, number>

  @BidirektField({ type: 'map<float[]>' })
  readings: Record<string, number[]>

  @BidirektField({ type: 'map<boolean>[]', optional: true })
  checks: unknown
}
