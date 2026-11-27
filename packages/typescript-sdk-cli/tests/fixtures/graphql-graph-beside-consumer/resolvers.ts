import {
  BidirektField,
  BidirektGraph,
  BidirektGraphqlConsumer,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Owner {
  @BidirektField()
  name: string
}

@BidirektGraph('petstore_graph')
export class PetResolver {
  @BidirektGraphqlConsumer({ provider: 'owners_api', query: 'owner', returns: Owner })
  owner() {}
}
