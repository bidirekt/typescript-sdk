import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt rest provides GET
 * @bidirekt response 200 Pet
 */
export function missingPath() {}

/**
 * @bidirekt rest consumes POST /charges
 * @bidirekt response 201
 */
export function missingProvider() {}

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response
 * @bidirekt response ok Pet
 * @bidirekt response 200 Pet as PetCard
 * @bidirekt response 404
 * @bidirekt response 404
 */
export function badResponses() {}

/**
 * @bidirekt rest provides PUT /pets/*
 * @bidirekt request Pet
 * @bidirekt request
 * @bidirekt response 204
 */
export function twoRequests() {}

/**
 * @bidirekt rest provides GET /pets
 * @bidirekt rest provides GET /pets/sold
 * @bidirekt response 200 Pet[] as
 */
export function twoHandlers() {}

/**
 * @bidirekt response 200 Pet
 */
export function responseWithoutHandler() {}

/**
 * @bidirekt
 * @bidirekt handles GET /pets
 */
export function unknownKeyword() {}

/**
 * @bidirekt schema Status
 */
export enum Status {
  Available = 'available',
}

/**
 * @bidirekt rest provides GET /pets/legacy
 * @bidirekt response 0200 Pet
 */
export function leadingZeroStatus() {}
