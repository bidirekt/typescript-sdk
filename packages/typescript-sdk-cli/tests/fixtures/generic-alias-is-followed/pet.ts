import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Nullable<T> = T | null
type Maybe<T> = Nullable<T> | undefined
type Dictionary<T> = Record<string, T>

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

@BidirektSchema()
export class Owner {
  @BidirektField()
  nickname: Nullable<string>

  @BidirektField()
  notes: Maybe<Nullable<string>[]>

  @BidirektField()
  scores: Dictionary<number>

  @BidirektField({ union: { cat: Cat, dog: Dog } })
  pets: Dictionary<Nullable<Cat | Dog>[]>
}
