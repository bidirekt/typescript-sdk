import * as bidirekt from '@bidirekt/typescript-sdk'

@bidirekt.BidirektSchema()
export class Pet {
  @bidirekt.BidirektField()
  name: string
}
