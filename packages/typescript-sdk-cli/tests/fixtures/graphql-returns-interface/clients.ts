import {
  BidirektField,
  BidirektGraphqlConsumer,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class UserName {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class PetSpecies {
  @BidirektField()
  species: string
}

@BidirektSchema({ union: { User: UserName, Pet: PetSpecies } })
export class Node {
  @BidirektField()
  id: string
}

@BidirektSchema({ union: { User: UserName, Pet: PetSpecies } })
export class SearchResult {}

@BidirektSchema()
export class NodeArguments {
  @BidirektField()
  id: string
}

export class NodeClient {
  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'node',
    arguments: NodeArguments,
    returns: { nullable: Node },
  })
  node() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'nodes',
    returns: [Node],
  })
  nodes() {}

  @BidirektGraphqlConsumer({
    provider: 'petstore_api',
    query: 'search',
    returns: [SearchResult],
  })
  search() {}
}
