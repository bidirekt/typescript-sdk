import { BidirektRestProvider } from '@bidirekt/typescript-sdk'

export class PetsController {
  /**
   * @typedef {{ limit: number }} ListQuery
   * @bidirekt rest provides GET /pets
   * @bidirekt response 200
   */
  @BidirektRestProvider({ method: 'GET', path: '/pets', responses: { 204: null } })
  list() {}
}
