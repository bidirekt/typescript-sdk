import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export class Animal {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Dog extends Animal {
  @BidirektField({ description: 'The name on the collar' })
  'name': string
}
