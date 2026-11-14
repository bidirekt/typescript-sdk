import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: 'available' | 'sold'

  @BidirektField()
  size: 'small' | 'medium' | 'large'

  @BidirektField()
  previousStatus: 'sold' | 'available' | null
}
