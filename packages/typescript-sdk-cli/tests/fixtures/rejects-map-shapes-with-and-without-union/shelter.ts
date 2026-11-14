import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Cat {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Dog {
  @BidirektField()
  name: string
}

export interface PetsByName {
  [name: string]: Cat | Dog
}

export interface NotesByRoom {
  [room: string]: string
}

@BidirektSchema()
export class Shelter {
  @BidirektField({ union: { cat: Cat, dog: Dog } })
  residents: Readonly<Record<string, Cat | Dog>>

  @BidirektField()
  labels: Readonly<Record<string, string>>

  @BidirektField({ union: { cat: Cat, dog: Dog } })
  byName: PetsByName

  @BidirektField()
  notes: NotesByRoom
}
