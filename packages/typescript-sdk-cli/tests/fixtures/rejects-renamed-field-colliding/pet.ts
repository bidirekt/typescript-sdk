import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ name: 'birth_date' })
  birthDate: string

  @BidirektField()
  birth_date: string
}
