import {
  BidirektGraphqlConsumer,
  BidirektGraphqlField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

type MaybeDate = Date | null
type LaterDate = Date | undefined

@BidirektSchema()
export class Pet {
  @BidirektGraphqlField({ scalar: 'DateTime' })
  shaped!: MaybeDate | string

  @BidirektGraphqlField({ scalar: 'DateTime' })
  adoptedAt!: LaterDate | string
}

export class PetstoreClient {
  @BidirektGraphqlConsumer({ provider: 'petstore_api', query: 'pet', returns: Pet })
  pet() {}
}
