import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import * as other from './lib/decorators.ts'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string

  @other.BidirektField()
  nickname: string
}
