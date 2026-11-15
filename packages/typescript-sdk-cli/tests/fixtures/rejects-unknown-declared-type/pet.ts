import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const dateType = 'string'

@BidirektSchema()
export class Pet {
  // @ts-expect-error 'date' is not a contract type
  @BidirektField({ type: 'date' })
  birthDate: Date

  // @ts-expect-error a map declares only its values
  @BidirektField({ type: 'map<string, integer>' })
  scores: Record<string, number>

  // @ts-expect-error a schema comes from the TypeScript type, not from "type"
  @BidirektField({ type: 'Owner' })
  owner: unknown

  @BidirektField({ type: dateType })
  adoptedAt: Date
}
