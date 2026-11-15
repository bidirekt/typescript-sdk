import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'Pet' })
export class Animal {
  @BidirektField()
  species: string
}
