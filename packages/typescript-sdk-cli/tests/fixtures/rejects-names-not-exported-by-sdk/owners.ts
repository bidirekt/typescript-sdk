import * as sdk from '@bidirekt/typescript-sdk'
import type { BidirektSchemaOptions } from '@bidirekt/typescript-sdk'
import { Pet } from './pets.ts'

export const ownerSchema: BidirektSchemaOptions = { name: 'Owner' }

export class OwnersController {
  @sdk.BidirektProvider({ method: 'GET', path: '/owners/*/pets', responses: { 200: Pet } })
  pets(): void {}
}
