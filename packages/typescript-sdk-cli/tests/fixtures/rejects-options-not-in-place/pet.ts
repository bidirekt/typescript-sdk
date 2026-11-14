import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const nameOptions = { name: 'pet_name' }

@BidirektSchema()
export class Pet {
  @BidirektField(nameOptions)
  name: string
}
