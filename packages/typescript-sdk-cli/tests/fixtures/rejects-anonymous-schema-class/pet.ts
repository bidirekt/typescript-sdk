import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export default class {
  @BidirektField()
  name: string
}
