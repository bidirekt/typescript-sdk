import type {
  Body,
  ConsumedResource,
  ProvidedResource,
  Response,
  SourceLocation,
} from './contract.ts'
import type { Diagnostic } from './diagnostic.ts'

export type MergedResources<T> = {
  resources: Array<T>
  errors: Array<Diagnostic>
}

export function providedToMerged(
  provides: Array<ProvidedResource>,
): MergedResources<ProvidedResource> {
  const resources: Array<ProvidedResource> = []
  const errors: Array<Diagnostic> = []
  for (const group of Map.groupBy(provides, providedToKey).values()) {
    const [first] = group
    resources.push(first)
    if (group.length === 1) {
      continue
    }
    const message = `"${first.method} ${first.path}" is provided by more than one handler: declare each method and path in one handler`
    for (const { location } of group) {
      errors.push({ message, location })
    }
  }
  return { resources, errors }
}

export function consumedToMerged(
  consumes: Array<ConsumedResource>,
): MergedResources<ConsumedResource> {
  const resources: Array<ConsumedResource> = []
  const errors = new Map<string, Diagnostic>()
  const addError = (message: string, location: SourceLocation): void => {
    errors.set(`${location.file}:${location.line} ${message}`, {
      message,
      location,
    })
  }
  for (const group of Map.groupBy(consumes, consumedToKey).values()) {
    const [first, ...others] = group
    const resource = `"${first.method} ${first.path}" consumed from "${first.provider}"`
    for (const other of others) {
      const conflict = requestsToConflict(first, other, resource)
      if (conflict !== undefined) {
        addError(conflict.message, conflict.first)
        addError(conflict.message, conflict.other)
      }
    }
    const responses = new Map<number, Response>()
    for (const response of group.flatMap((handler) => handler.responses)) {
      const kept = responses.get(response.status)
      if (kept === undefined) {
        responses.set(response.status, response)
      } else if (kept.schema !== response.schema) {
        const message = `response ${response.status} of ${resource} is declared as ${schemaToText(kept.schema)} and ${schemaToText(response.schema)}: declare one schema with every field the service reads`
        addError(message, kept.location)
        addError(message, response.location)
      }
    }
    resources.push({ ...first, responses: [...responses.values()] })
  }
  return { resources, errors: [...errors.values()] }
}

type RequestConflict = {
  message: string
  first: SourceLocation
  other: SourceLocation
}

function requestsToConflict(
  first: ConsumedResource,
  other: ConsumedResource,
  resource: string,
): RequestConflict | undefined {
  if (first.request === undefined && other.request === undefined) {
    return undefined
  }
  if (first.request === undefined || other.request === undefined) {
    return {
      message: `request of ${resource} is declared in one handler and not in another: declare the same request in every handler`,
      first: requestToLocation(first),
      other: requestToLocation(other),
    }
  }
  if (first.request.schema === other.request.schema) {
    return undefined
  }
  return {
    message: `request of ${resource} is declared as ${schemaToText(first.request.schema)} and ${schemaToText(other.request.schema)}: declare the same request in every handler`,
    first: first.request.location,
    other: other.request.location,
  }
}

function requestToLocation(resource: ProvidedResource): SourceLocation {
  return resource.request?.location ?? resource.location
}

function schemaToText(schema: Body['schema']): string {
  if (schema === null) {
    return 'null'
  }
  return `"${schema}"`
}

function providedToKey(resource: ProvidedResource): string {
  return JSON.stringify([resource.method, resource.path])
}

function consumedToKey(resource: ConsumedResource): string {
  return JSON.stringify([resource.provider, resource.method, resource.path])
}
