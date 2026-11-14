import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum Priority {
  Low,
  High = 10,
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  priority: Priority
}
