import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class ReviewsArgs {
  @BidirektField({ type: 'integer' })
  first: number
}

@BidirektSchema()
export class Pet {
  // @ts-expect-error a scalar goes in @BidirektGraphqlField
  @BidirektField({ scalar: 'DateTime' })
  bornAt: string

  // @ts-expect-error arguments go in @BidirektGraphqlField
  @BidirektField({ arguments: ReviewsArgs })
  reviews: Array<string>
}

/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field scalar=DateTime */
  joinedAt: string
}

/**
 * @bidirekt graphql consumes petstore_api query health
 * @bidirekt returns Health
 *
 * @bidirekt schema Health
 * @bidirekt field checkedAt type=string scalar=DateTime
 */
export function health() {}
