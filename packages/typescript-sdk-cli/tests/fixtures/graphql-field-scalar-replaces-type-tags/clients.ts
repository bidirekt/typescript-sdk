type Timestamp = string & { readonly brand: 'Timestamp' }

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt graphql field scalar=DateTime */
  bornAt: Date

  /** @bidirekt graphql field scalar=DateTime */
  adoptedAt: any

  /** @bidirekt graphql field scalar=DateTime */
  vaccinatedAt: unknown

  /** @bidirekt graphql field scalar=DateTime */
  checkedAt: Timestamp

  /** @bidirekt graphql field scalar=DateTime */
  visits: Date[]

  /** @bidirekt graphql field scalar=DateTime */
  soldAt?: Date | null
}

/**
 * @bidirekt graphql consumes petstore_api query pet
 * @bidirekt returns Pet
 */
export function pet() {}
