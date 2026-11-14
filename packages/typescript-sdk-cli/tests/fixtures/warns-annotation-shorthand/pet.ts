import * as sdk from '@bidirekt/typescript-sdk'
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const contract = { BidirektField }

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string

  @contract.BidirektField({ type: 'integer' })
  id: number
}

export function owner() {
  const { BidirektField } = sdk
  return BidirektField
}
