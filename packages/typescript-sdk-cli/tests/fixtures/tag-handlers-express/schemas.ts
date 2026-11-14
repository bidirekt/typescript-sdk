import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ type: 'integer' })
  id: number

  @BidirektField()
  name: string
}

@BidirektSchema()
export class NewPet {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class NewCharge {
  @BidirektField({ type: 'integer' })
  amount: number
}

@BidirektSchema()
export class Charge {
  @BidirektField()
  id: string
}
