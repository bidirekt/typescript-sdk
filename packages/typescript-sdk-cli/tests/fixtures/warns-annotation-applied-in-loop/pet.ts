import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  id: string

  name: string
  tag: string
}

for (const key of ['name', 'tag']) {
  BidirektField()(Pet.prototype, key)
}
