import type { Reference } from '../../../protocols.ts'
import type { Resource } from './contract.ts'

export function resourcesToReferences(
  resources: Array<Resource>,
): Array<Reference> {
  return resources
    .flatMap((resource) => [resource.request, ...resource.responses])
    .flatMap((body) => {
      if (body === undefined || body.schema === null) {
        return []
      }
      return [{ schema: body.schema, location: body.location }]
    })
}
