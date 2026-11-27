import type { Reference } from '../../../protocols.ts'
import type { GraphqlBlock } from './contract.ts'

export function blockToReferences(block: GraphqlBlock): Array<Reference> {
  return block.operations.flatMap((operation) =>
    [operation.arguments, operation.returns].flatMap((use) => {
      if (use === undefined) {
        return []
      }
      return [{ schema: use.schema, location: use.location }]
    }),
  )
}
