import {
  BidirektGraphqlConsumer,
  BidirektGraphqlField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

type Timestamp = string & { readonly brand: 'Timestamp' }

@BidirektSchema()
export class Pet {
  @BidirektGraphqlField({ scalar: 'DateTime' })
  bornAt!: Date

  @BidirektGraphqlField({ scalar: 'DateTime' })
  adoptedAt: any

  @BidirektGraphqlField({ scalar: 'DateTime' })
  vaccinatedAt: unknown

  @BidirektGraphqlField({ scalar: 'DateTime' })
  checkedAt!: Timestamp

  @BidirektGraphqlField({ scalar: 'DateTime' })
  visits!: Date[]

  @BidirektGraphqlField({ scalar: 'DateTime' })
  soldAt?: Date | null
}

export class PetstoreClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', returns: Pet })
  pet() {}
}
