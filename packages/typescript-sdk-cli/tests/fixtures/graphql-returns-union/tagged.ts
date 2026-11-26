/**
 * @bidirekt graphql consumes petstore_api query search
 * @bidirekt returns union={Pet: Pet, Owner: Owner}[] as SearchResult
 */
export function search() {}

/**
 * @bidirekt graphql consumes petstore_api query featured
 * @bidirekt returns union={Pet: Pet, Owner: Owner} as SearchResult
 */
export function featured() {}

/**
 * @bidirekt graphql consumes petstore_api query lookup
 * @bidirekt returns union={Pet: Pet, Owner: Owner}? as SearchResult
 */
export function lookup() {}

/**
 * @bidirekt graphql consumes petstore_api query recent
 * @bidirekt returns union={Pet: Pet, Owner: Owner}[]? as SearchResult
 */
export function recent() {}

/**
 * @bidirekt graphql consumes petstore_api query history
 * @bidirekt returns union={Pet: Pet, Owner: Owner}?[] as SearchResult
 */
export function history() {}
