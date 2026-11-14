declare const app: { get(path: string): typeof app }

export const pets = app
  /** @Bidirekt provides GET /pets */
  .get('/pets')

export const toys = app
  /**
   * @bidirektprovides GET /toys
   */
  .get('/toys')

export const owners = app
  /** Read by @bidirekt/typescript-sdk, like @Bidirekt tags. */
  .get('/owners')

export const people = app
  /** @BidirektProvider is a decorator. */
  .get('/people')

/**
 * @bidirekt provides GET /owners
 * @bidirekt response 200
 */
export function listOwners() {}
