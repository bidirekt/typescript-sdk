/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}

/**
 * @bidirekt graphql consumes petstore_api pet
 * @bidirekt returns Pet
 */
export function missingKind() {}

/**
 * @bidirekt graphql provides query pet
 * @bidirekt returns Pet
 */
export function provides() {}

/**
 * @bidirekt graphql consumes petstore_api query pets
 */
export function withoutReturns() {}

/**
 * @bidirekt graphql consumes petstore_api query namedPet
 * @bidirekt returns Pet as MaybePet
 */
export function namedSchema() {}

/**
 * @bidirekt graphql consumes petstore_api query status
 * @bidirekt returns enum:AVAILABLE|SOLD
 */
export function unnamedEnum() {}

/**
 * @bidirekt graphql consumes petstore_api query brackets
 * @bidirekt returns Pet[][]
 */
export function nestedList() {}

/**
 * @bidirekt graphql consumes petstore_api query search
 * @bidirekt arguments
 * @bidirekt returns Pet
 * @bidirekt returns Pet[]
 */
export function emptyArguments() {}

/** @bidirekt returns Pet */
export function withoutHandler() {}

/** @bidirekt graph */
export class WithoutGraphName {}

/** @bidirekt graph petstore_graph other_graph */
export class TwoGraphNames {}
