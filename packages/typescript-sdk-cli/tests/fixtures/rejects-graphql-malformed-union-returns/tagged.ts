/**
 * @bidirekt graphql consumes petstore_api query featured
 * @bidirekt returns union={Pet: Pet, Owner: Owner}
 */
export function featured() {}

/**
 * @bidirekt graphql consumes petstore_api query search
 * @bidirekt returns union={Pet: Pet, Owner: Owner}[]
 */
export function search() {}

/**
 * @bidirekt graphql consumes petstore_api query lookup
 * @bidirekt returns union={Pet, Owner} as SearchResult
 */
export function lookup() {}
