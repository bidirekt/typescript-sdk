/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field */
  email: string
}

/**
 * @bidirekt graphql consumes petstore_api query search
 * @bidirekt returns union={Pet: Pet, Owner: Owner}[] as SearchResultList
 */
export function search() {}

/**
 * @bidirekt graphql consumes petstore_api query featured
 * @bidirekt returns union={Pet: Pet, Owner: Owner} as SearchResult
 */
export function featured() {}

/**
 * @bidirekt graphql consumes petstore_api query lookup
 * @bidirekt returns union={Pet: Pet, Owner: Owner}? as SearchResultOrNull
 */
export function lookup() {}

/**
 * @bidirekt graphql consumes petstore_api query recent
 * @bidirekt returns union={Pet: Pet, Owner: Owner}[]? as SearchResultListOrNull
 */
export function recent() {}

/**
 * @bidirekt graphql consumes petstore_api query history
 * @bidirekt returns union={Pet: Pet, Owner: Owner}?[] as SearchResultOrNullList
 */
export function history() {}
