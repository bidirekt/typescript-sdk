import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export const findPet = (id: string) => ({ id })

/**
 * @bidirekt rest provides DELETE /pets/*
 * @bidirekt response 204
 */
export default (id: string) => ({ id })
