/**
 * @bidirekt graphql consumes petstore_api query status
 * @bidirekt returns enum:AVAILABLE|SOLD? as Status
 */
export function status() {}

/**
 * @bidirekt graphql consumes petstore_api query statuses
 * @bidirekt returns enum:AVAILABLE|SOLD[] as Status
 */
export function statuses() {}
