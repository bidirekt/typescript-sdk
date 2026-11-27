import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class UserName {
  @BidirektField()
  name: string
}

@BidirektSchema({ union: { User: UserName, Node: Node } })
export class Node {
  @BidirektField()
  id: string
}
