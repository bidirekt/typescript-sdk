/**
 * Finds a pet by its id.
 *
 * @example
 * ```ts
 * await findPet('42')
 * ```
 *
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200
 * @bidirekt response 404
 */
export async function findPet(id: string) {
  return id
}
