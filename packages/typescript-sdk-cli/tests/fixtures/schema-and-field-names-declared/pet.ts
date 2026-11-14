import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'PetResponse' })
export class Pet {
  @BidirektField({ name: 'birth_date' })
  birthDate: string
}
