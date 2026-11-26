import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'Animal' })
@BidirektSchema({ name: 'Pet' })
export class Pet {
  @BidirektField({ name: 'nickname' })
  @BidirektField({ name: 'name' })
  name: string
}

@BidirektSchema({ union: { Pet: Pet } })
@BidirektSchema()
export class Owner {
  @BidirektField()
  name: string
}
