import { createCharge } from './charges.ts'
import { petsRouter } from './pets.ts'

if (petsRouter.routes.length !== 2) {
  throw new Error('the app did not load its routes')
}
await createCharge({ amount: 100 })
