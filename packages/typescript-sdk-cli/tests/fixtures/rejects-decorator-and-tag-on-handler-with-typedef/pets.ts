import { BidirektProvider } from '@bidirekt/typescript-sdk'

export class PetsController {
  /**
   * @typedef {{ limit: number }} ListQuery
   * @bidirekt provides GET /pets
   * @bidirekt response 200
   */
  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 204: null } })
  list() {}
}
