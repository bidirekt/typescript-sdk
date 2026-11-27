import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides get /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {}

/**
 * @bidirekt rest consumes payments_api Post /charges
 * @bidirekt response 201
 */
export function charge() {}
