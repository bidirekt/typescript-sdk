import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'PetOwner' })
export class Owner {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  owner: Owner

  @BidirektField()
  previousOwners: Owner[]
}
