import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Key = string

type PetsByName = { [name: string]: Pet }

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Shelter {
  @BidirektField()
  capacity: { [room: string]: number }

  @BidirektField()
  notes: { readonly [room: Key]: string | null }

  @BidirektField()
  pets: PetsByName

  @BidirektField()
  tags: Record<Key, string>
}
