import * as sdk from '@bidirekt/typescript-sdk'
import BidirektField = sdk.BidirektField

@sdk.BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}
