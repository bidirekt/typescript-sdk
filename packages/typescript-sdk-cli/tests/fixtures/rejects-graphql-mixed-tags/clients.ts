import {
  BidirektField,
  BidirektGraphqlConsumer,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest consumes petstore_api GET /pets
 * @bidirekt returns Pet[]
 */
export function restPets() {}

/**
 * @bidirekt graphql consumes petstore_api query pet
 * @bidirekt returns Pet
 * @bidirekt response 200 Pet
 */
export function graphqlPet() {}

/**
 * @bidirekt rest consumes petstore_api GET /pets/*
 * @bidirekt graphql consumes petstore_api query pets
 * @bidirekt returns Pet[]
 */
export function bothPets() {}

export class PetstoreClient {
  /**
   * @bidirekt graphql consumes petstore_api query petCount
   * @bidirekt returns integer
   */
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'petCount', returns: 'integer' })
  petCount() {}
}
