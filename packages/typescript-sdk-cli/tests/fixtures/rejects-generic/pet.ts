import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Owner {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Page<T> {
  @BidirektField()
  cursor: string

  items: T[]
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  owners: Page<Owner>
}
