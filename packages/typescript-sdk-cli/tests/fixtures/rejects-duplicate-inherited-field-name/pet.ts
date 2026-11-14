import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export class Entity {
  @BidirektField({ name: 'id' })
  identifier: string
}

@BidirektSchema()
export class Pet extends Entity {
  @BidirektField()
  id: string
}
