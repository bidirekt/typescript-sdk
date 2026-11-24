import type { Resource } from '../../../model/protocols/rest/contract.ts'
import type { ProtocolInput, ProtocolRead } from '../../../protocols.ts'
import { sdkDecoratorsToResources } from './handler-methods.ts'
import { taggedCommentsToResources } from './tag-handlers.ts'

export function protocolInputToResources(
  input: ProtocolInput,
): ProtocolRead<Array<Resource>> {
  const decorated = sdkDecoratorsToResources(input.decorators, input.context)
  const tagged = taggedCommentsToResources(input.comments)
  return {
    blocks: [...decorated.blocks, ...tagged.blocks],
    derived: [...decorated.derived, ...tagged.derived],
    errors: [...decorated.errors, ...tagged.errors],
  }
}
