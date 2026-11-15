import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import { Entity } from '@acme/dto'

@BidirektSchema()
export class Pet extends Entity {
  @BidirektField()
  name: string
}
