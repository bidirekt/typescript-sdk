import * as sdk from '@bidirekt/typescript-sdk'
import BidirektConsumer = sdk.BidirektConsumer
import { Pet } from './pets.ts'

export class VetsClient {
  @BidirektConsumer({ provider: 'petstore_api', method: 'GET', path: '/pets', responses: { 200: Pet } })
  pets(): void {}
}
