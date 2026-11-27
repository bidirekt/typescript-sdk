/**
 * @bidirekt graphql consumes petstore_api mutation deletePet
 * @bidirekt returns boolean
 */
export function deletePet() {}

/**
 * @bidirekt graphql consumes petstore_api query tags
 * @bidirekt returns string[]
 */
export function tags() {}

/**
 * @bidirekt graphql consumes petstore_api query now
 * @bidirekt returns scalar:DateTime
 */
export function now() {}

/**
 * @bidirekt graphql consumes petstore_api query status
 * @bidirekt returns enum:AVAILABLE|SOLD as Status
 */
export function status() {}

/**
 * @bidirekt graphql consumes petstore_api query petCount
 * @bidirekt returns integer?
 */
export function petCount() {}

/**
 * @bidirekt graphql consumes petstore_api query visits
 * @bidirekt returns scalar:DateTime?[]
 */
export function visits() {}

/**
 * @bidirekt graphql consumes petstore_api query closedAt
 * @bidirekt returns scalar:DateTime? as InstantOrNull
 */
export function closedAt() {}
