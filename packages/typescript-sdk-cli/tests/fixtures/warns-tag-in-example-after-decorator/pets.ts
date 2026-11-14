import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string
}

/**
 * How a class handler declares its contract.
 * @example
 * @Injectable()
 * class HealthService {}
 * @bidirekt provides GET /health
 * @bidirekt response 200
 */
export function documented(): void {}
