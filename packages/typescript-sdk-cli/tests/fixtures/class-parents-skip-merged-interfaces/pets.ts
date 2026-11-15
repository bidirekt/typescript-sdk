import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Timestamps {
  @BidirektField()
  createdAt: string
}

export interface Animal extends Timestamps {}

@BidirektSchema()
export class Animal {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Dog extends Animal {
  @BidirektField()
  breed: string
}
