import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ name: 'created_at' })
  createdAt: string

  @BidirektField({ name: 'created_at' })
  updatedAt: string
}
