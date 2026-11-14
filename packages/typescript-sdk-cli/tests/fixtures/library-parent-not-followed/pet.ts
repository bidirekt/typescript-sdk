import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import { BaseEntity } from 'base-entity'

@BidirektSchema()
export class Pet extends BaseEntity {
  @BidirektField()
  name: string
}
