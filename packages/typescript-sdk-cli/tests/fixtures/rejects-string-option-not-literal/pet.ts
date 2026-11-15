import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const petName = 'pet_name'

@BidirektSchema()
export class Pet {
  @BidirektField({ name: petName })
  name: string
}
