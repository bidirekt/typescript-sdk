import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type PetStatus = 'available' | 'sold'
type Nickname = string | null

@BidirektSchema()
export class Pet {
  @BidirektField()
  status: PetStatus

  @BidirektField()
  nickname: Nickname
}
