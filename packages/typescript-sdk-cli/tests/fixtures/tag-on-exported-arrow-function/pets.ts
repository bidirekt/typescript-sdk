import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export const findPet = (id: string) => ({ id })

/**
 * @bidirekt provides DELETE /pets/*
 * @bidirekt response 204
 */
export default (id: string) => ({ id })
