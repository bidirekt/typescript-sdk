import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export class Animal {
  @BidirektField()
  name: string

  @BidirektField()
  age: number
}

@BidirektSchema()
export class Dog extends Animal {
  @BidirektField({ description: 'The name the owner calls the dog' })
  name: string
}
