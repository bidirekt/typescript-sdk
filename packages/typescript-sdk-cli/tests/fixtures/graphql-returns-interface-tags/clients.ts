/** @bidirekt schema */
export interface UserName {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface PetSpecies {
  /** @bidirekt field */
  species: string
}

/** @bidirekt schema union={User: UserName, Pet: PetSpecies} */
export interface Node {
  /** @bidirekt field */
  id: string
}

/** @bidirekt schema union={User: UserName, Pet: PetSpecies} */
export interface SearchResult {}

/** @bidirekt schema */
export interface NodeArguments {
  /** @bidirekt field */
  id: string
}

/**
 * @bidirekt graphql consumes petstore_api query node
 * @bidirekt arguments NodeArguments
 * @bidirekt returns Node?
 */
export function node() {}

/**
 * @bidirekt graphql consumes petstore_api query nodes
 * @bidirekt returns Node[]
 */
export function nodes() {}

/**
 * @bidirekt graphql consumes petstore_api query search
 * @bidirekt returns SearchResult[]
 */
export function search() {}
