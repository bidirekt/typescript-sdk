import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string
}

/**
 * @bidirekt provides POST /pets
 * @bidirekt request Pet
 * @bidirekt response 201
 *
 * ```ts
 * await fetch('/pets', { method: 'POST', body: JSON.stringify(pet) })
 * ```
 */
export function createPet(): void {}
