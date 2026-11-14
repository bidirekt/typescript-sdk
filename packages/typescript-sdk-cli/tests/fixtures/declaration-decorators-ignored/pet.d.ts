import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export declare class Pet {
  @BidirektField()
  name: string
}

export declare const Field: typeof BidirektField
