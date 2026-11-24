import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides PUT /pets/*
 * @bidirekt request
 * @bidirekt response 200 Pet
 * @bidirekt response 404
 */
export function replacePet() {}
