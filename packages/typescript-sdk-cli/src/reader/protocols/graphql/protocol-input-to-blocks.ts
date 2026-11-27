import type { GraphqlBlock } from '../../../model/protocols/graphql/contract.ts'
import type { ProtocolInput, ProtocolRead } from '../../../protocols.ts'
import { sdkDecoratorsToBlocks } from './decorators-to-blocks.ts'
import { taggedCommentsToBlocks } from './tags-to-blocks.ts'

export function protocolInputToBlocks(
  input: ProtocolInput,
): ProtocolRead<GraphqlBlock> {
  const decorated = sdkDecoratorsToBlocks(input.decorators, input.context)
  const tagged = taggedCommentsToBlocks(input.comments)
  return {
    blocks: [...decorated.blocks, ...tagged.blocks],
    derived: [...decorated.derived, ...tagged.derived],
    errors: [...decorated.errors, ...tagged.errors],
  }
}
