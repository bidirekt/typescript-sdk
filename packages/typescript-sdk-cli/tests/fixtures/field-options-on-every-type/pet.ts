import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Owner {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Pet {
  @BidirektField({ optional: true, nullable: true, description: 'Name' })
  name: string

  @BidirektField({ type: 'integer', optional: true, nullable: true, description: 'Age' })
  age: number

  @BidirektField({ type: 'float', optional: true, nullable: true, description: 'Kg' })
  weight: number

  @BidirektField({ optional: true, nullable: true, description: 'Score' })
  score: number

  @BidirektField({ optional: true, nullable: true, description: 'Shots' })
  vaccinated: boolean

  @BidirektField({ optional: true, nullable: true, description: 'Status' })
  status: 'available' | 'sold'

  @BidirektField({ optional: true, nullable: true, description: 'Tags' })
  tags: string[]

  @BidirektField({ optional: true, nullable: true, description: 'Scores' })
  scores: Record<string, number | null>

  @BidirektField({ optional: true, nullable: true, description: 'Owner' })
  owner: Owner

  @BidirektField({ union: { person: Owner }, optional: true, nullable: true, description: 'Keeper' })
  keeper: Owner
}
