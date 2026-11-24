import type { NamedSchema, SourceLocation } from '../../../model/contract.ts'
import { isDiagnostic } from '../../../model/diagnostic.ts'
import type { Diagnostic } from '../../../model/diagnostic.ts'
import type {
  Body,
  Resource,
  Response,
} from '../../../model/protocols/rest/contract.ts'
import { listToNamedSchema } from '../../../model/protocols/rest/schema-names.ts'
import type { ProtocolRead } from '../../../protocols.ts'
import { isHandlerTag, tagToText } from '../../comment-tags.ts'
import type {
  CommentTag,
  HandlerTag,
  TaggedComment,
} from '../../comment-tags.ts'
import {
  declaredToRead,
  methodToUppercaseDiagnostic,
  statusToNumberDiagnostic,
} from './handler-methods.ts'

type Endpoint = {
  provider?: string
  method: string
  path: string
}

const endpointForms = {
  provides: { usage: '@bidirekt rest provides <METHOD> <path>', arguments: 2 },
  consumes: {
    usage: '@bidirekt rest consumes <provider> <METHOD> <path>',
    arguments: 3,
  },
}

const bodyPattern = /^([^\s[\]]+)(?:\[\](?: as [^\s[\]]+)?)?$/

export function taggedCommentsToResources(
  comments: Array<TaggedComment>,
): ProtocolRead<Array<Resource>> {
  const read: ProtocolRead<Array<Resource>> = {
    blocks: [],
    derived: [],
    errors: [],
  }
  for (const { tags } of comments) {
    const handler = tags.find(isHandlerTag)
    const bodies = tags.filter((tag) => !isHandlerTag(tag))
    if (handler === undefined) {
      read.errors.push(
        ...bodies.map((tag) => ({
          message: `"@bidirekt ${tag.keyword}" needs a "@bidirekt rest provides" or "@bidirekt rest consumes" tag in the same comment`,
          location: tag.location,
        })),
      )
      continue
    }
    tagsToResource(handler, bodies, read)
  }
  return read
}

function tagsToResource(
  handler: HandlerTag,
  bodies: Array<CommentTag>,
  read: ProtocolRead<Array<Resource>>,
): void {
  const errors: Array<Diagnostic> = []
  const derived: Array<NamedSchema> = []
  const endpoint = handlerToEndpoint(handler)
  if (isDiagnostic(endpoint)) {
    errors.push(endpoint)
  }
  let request: Body | undefined
  const responses: Array<Response> = []
  for (const tag of bodies) {
    if (tag.error !== undefined) {
      errors.push(tag.error)
      continue
    }
    if (tag.keyword === 'request') {
      if (request !== undefined) {
        errors.push({
          message: `"@bidirekt request" is declared more than once in this comment: keep one`,
          location: tag.location,
        })
        continue
      }
      const body = argumentsToBody(tag.arguments, tag.location, derived)
      if (isDiagnostic(body)) {
        errors.push(body)
        continue
      }
      request = body
      continue
    }
    const response = tagToResponse(tag, responses, derived)
    if (isDiagnostic(response)) {
      errors.push(response)
      continue
    }
    responses.push(response)
  }
  read.errors.push(...errors)
  if (isDiagnostic(endpoint) || errors.length > 0) {
    return
  }
  declaredToRead(
    { ...endpoint, request, responses, location: handler.location },
    derived,
    read,
  )
}

function handlerToEndpoint(handler: HandlerTag): Endpoint | Diagnostic {
  if (handler.error !== undefined) {
    return handler.error
  }
  const [form, ...endpointArguments] = handler.arguments
  if (form !== 'provides' && form !== 'consumes') {
    return {
      message: `cannot read "${tagToText(handler)}": write "${endpointForms.provides.usage}" or "${endpointForms.consumes.usage}"`,
      location: handler.location,
    }
  }
  const { usage, arguments: count } = endpointForms[form]
  if (endpointArguments.length !== count) {
    return {
      message: `cannot read "${tagToText(handler)}": write "${usage}"`,
      location: handler.location,
    }
  }
  const [method, path] = endpointArguments.slice(-2)
  const uppercase = methodToUppercaseDiagnostic(method, handler.location)
  if (uppercase !== undefined) {
    return uppercase
  }
  const endpoint: Endpoint = { method, path }
  if (form === 'consumes') {
    endpoint.provider = endpointArguments[0]
  }
  return endpoint
}

function tagToResponse(
  tag: CommentTag,
  declared: Array<Response>,
  derived: Array<NamedSchema>,
): Response | Diagnostic {
  if (tag.arguments.length === 0) {
    return {
      message: `cannot read "${tagToText(tag)}": write "@bidirekt response <status> [schema]"`,
      location: tag.location,
    }
  }
  const [status, ...body] = tag.arguments
  const number = statusToNumberDiagnostic(status, tag.location)
  if (number !== undefined) {
    return number
  }
  if (declared.some((response) => response.status === Number(status))) {
    return {
      message: `response status "${status}" is declared more than once in this comment: keep one`,
      location: tag.location,
    }
  }
  const read = argumentsToBody(body, tag.location, derived)
  if (isDiagnostic(read)) {
    return read
  }
  return { ...read, status: Number(status) }
}

function argumentsToBody(
  body: Array<string>,
  location: SourceLocation,
  derived: Array<NamedSchema>,
): Body | Diagnostic {
  if (body.length === 0) {
    return { schema: null, location }
  }
  const text = body.join(' ')
  const match = bodyPattern.exec(text)
  if (match === null) {
    return {
      message: `cannot read "${text}" as a body: write "<schema>", "<schema>[]" or "<schema>[] as <name>"`,
      location,
    }
  }
  const [, schema] = match
  if (!text.includes('[]')) {
    return { schema, location }
  }
  const list = listToNamedSchema(schema, / as (\S+)$/.exec(text)?.[1], location)
  derived.push(list)
  return { schema: list.name, location }
}
