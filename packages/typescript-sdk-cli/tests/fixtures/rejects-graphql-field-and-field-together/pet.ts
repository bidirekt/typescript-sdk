import {
  BidirektField,
  BidirektGraphqlField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektGraphqlField({ scalar: 'DateTime' })
  @BidirektField()
  bornAt: string

  @BidirektField({ name: 'adopted_at' })
  @BidirektGraphqlField({ scalar: 'DateTime' })
  adoptedAt: string
}
