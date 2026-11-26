import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const userKey = 'User'

export class Unannotated {
  name: string
}

@BidirektSchema()
export class UserName {
  @BidirektField()
  name: string
}

@BidirektSchema({ union: UserName })
export class Node {}

@BidirektSchema({ union: { User: Unannotated } })
export class Actor {}

@BidirektSchema({ union: { [userKey]: UserName } })
export class Owner {}
