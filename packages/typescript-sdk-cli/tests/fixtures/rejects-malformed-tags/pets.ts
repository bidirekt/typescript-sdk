import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

/**
 * @bidirekt provides GET
 * @bidirekt response 200 Pet
 */
export function missingPath() {}

/**
 * @bidirekt consumes POST /charges
 * @bidirekt response 201
 */
export function missingProvider() {}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response
 * @bidirekt response ok Pet
 * @bidirekt response 200 Pet as PetCard
 * @bidirekt response 404
 * @bidirekt response 404
 */
export function badResponses() {}

/**
 * @bidirekt provides PUT /pets/*
 * @bidirekt request Pet
 * @bidirekt request
 * @bidirekt response 204
 */
export function twoRequests() {}

/**
 * @bidirekt provides GET /pets
 * @bidirekt provides GET /pets/sold
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
 * @bidirekt provides GET /pets/legacy
 * @bidirekt response 0200 Pet
 */
export function leadingZeroStatus() {}
