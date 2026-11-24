declare const app: { get(path: string): typeof app }

export const pets = app
  /** @Bidirekt rest provides GET /pets */
  .get('/pets')

export const toys = app
  /**
   * @bidirektrest provides GET /toys
   */
  .get('/toys')

export const owners = app
  /** Read by @bidirekt/typescript-sdk, like @Bidirekt tags. */
  .get('/owners')

export const people = app
  /** @BidirektRestProvider is a decorator. */
  .get('/people')

/**
 * @bidirekt rest provides GET /owners
 * @bidirekt response 200
 */
export function listOwners() {}
