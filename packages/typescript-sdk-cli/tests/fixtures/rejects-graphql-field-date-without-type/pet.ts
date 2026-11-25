import { BidirektGraphqlField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektGraphqlField({ description: 'Day of birth' })
  birthDate: Date
}
