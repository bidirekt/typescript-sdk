import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

/**
 * The pet the API returns. Declare a field like this:
 * ```ts
 * @BidirektField({ type: 'integer' })
 * id: number
 * ```
 */
@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string
}

/**
 * Function handlers declare their contract in a comment:
 * ```ts
 * @bidirekt provides GET /health
 * @bidirekt response 200
 * @Bidirekt provides GET /typo
 * ```
 */
export function documented(): void {}
