import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Constructor = new (...args: Array<any>) => object

function Timestamped<T extends Constructor>(base: T) {
  return class extends base {
    createdAt = ''
  }
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

const Base = Timestamped(Pet)

@BidirektSchema()
export class Dog extends Timestamped(Pet) {
  @BidirektField()
  breed: string
}

@BidirektSchema()
export class Puppy extends Dog {}

@BidirektSchema()
export class Cat extends Base {}
