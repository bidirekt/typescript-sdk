import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export class Entity {
  @BidirektField()
  id: number
}

@BidirektSchema()
export class Pet extends Entity {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Dog extends Pet {
  @BidirektField()
  breed: string
}
