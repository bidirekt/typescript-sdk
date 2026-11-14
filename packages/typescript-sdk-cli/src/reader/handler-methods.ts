import ts from 'typescript'
import type {
  Body,
  ConsumedResource,
  NamedSchema,
  ProvidedResource,
  Response,
} from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { listToNamedSchema } from '../model/schema-names.ts'
import { expressionToSchemaRef } from './expression-to-schema-node.ts'
import {
  computedKeyToValue,
  expressionToLiteralOptions,
  literalOptionToName,
  literalOptionToString,
} from './literal-options.ts'
import type { LiteralOptions } from './literal-options.ts'
import { nodeToLocation } from './location.ts'
import type { SchemaContext } from './schema-context.ts'
import type { SdkReference } from './sdk-references.ts'

export type ReadResources = {
  provides: Array<ProvidedResource>
  consumes: Array<ConsumedResource>
  schemas: Array<NamedSchema>
  errors: Array<Diagnostic>
}

type HandlerAnnotation = 'BidirektProvider' | 'BidirektConsumer'

type HandlerRead = {
  options: LiteralOptions
  what: string
  call: ts.CallExpression
  context: SchemaContext
  derived: Array<NamedSchema>
  errors: Array<Diagnostic>
}

const listKeys = ['list', 'name']

const handlerOptions: Record<HandlerAnnotation, Array<string>> = {
  BidirektProvider: ['method', 'path', 'request', 'responses'],
  BidirektConsumer: ['provider', 'method', 'path', 'request', 'responses'],
}

export function sdkReferencesToResources(
  references: Array<SdkReference>,
  context: SchemaContext,
): ReadResources {
  const read: ReadResources = {
    provides: [],
    consumes: [],
    schemas: [],
    errors: [],
  }
  for (const reference of references) {
    if (
      reference.use !== 'decorator' ||
      (reference.name !== 'BidirektProvider' &&
        reference.name !== 'BidirektConsumer')
    ) {
      continue
    }
    const { name, call } = reference
    const what = `@${name}`
    const options = expressionToLiteralOptions(
      call.arguments[0],
      `${what} options`,
      handlerOptions[name],
    )
    if (isDiagnostic(options)) {
      read.errors.push(options)
      continue
    }
    const handler: HandlerRead = {
      options,
      what,
      call,
      context,
      derived: [],
      errors: [],
    }
    let provider: string | undefined
    if (name === 'BidirektConsumer') {
      provider = withoutDiagnostic(requiredString(handler, 'provider'), handler)
    }
    const resource = handlerToResource(handler)
    read.errors.push(...handler.errors)
    if (resource === undefined) {
      continue
    }
    read.schemas.push(...handler.derived)
    if (provider === undefined) {
      read.provides.push(resource)
    } else {
      read.consumes.push({ ...resource, provider })
    }
  }
  return read
}

function handlerToResource(handler: HandlerRead): ProvidedResource | undefined {
  const method = withoutDiagnostic(handlerToMethod(handler), handler)
  const path = withoutDiagnostic(requiredString(handler, 'path'), handler)
  const requestExpression = handler.options.get('request')
  let request: Body | undefined
  if (requestExpression !== undefined) {
    request = withoutDiagnostic(
      expressionToBody(requestExpression, handler),
      handler,
    )
  }
  const responses = handlerToResponses(handler)
  if (method === undefined || path === undefined || handler.errors.length > 0) {
    return undefined
  }
  const resource: ProvidedResource = {
    method,
    path,
    responses,
    location: nodeToLocation(handler.call),
  }
  if (request !== undefined) {
    resource.request = request
  }
  return resource
}

function handlerToMethod(handler: HandlerRead): string | Diagnostic {
  const method = requiredString(handler, 'method')
  if (isDiagnostic(method) || method === method.toUpperCase()) {
    return method
  }
  return {
    message: `method "${method}" must be uppercase: write "${method.toUpperCase()}"`,
    location: nodeToLocation(handler.options.get('method') ?? handler.call),
  }
}

function handlerToResponses(handler: HandlerRead): Array<Response> {
  const expression = handler.options.get('responses')
  if (expression === undefined) {
    handler.errors.push(missingOption(handler, 'responses'))
    return []
  }
  const statuses = expressionToLiteralOptions(
    expression,
    '"responses"',
    undefined,
    (key) => {
      const value =
        computedKeyToValue(key, handler.context.checker) ?? 'the number'
      return `response status "${key.getText()}" must be a number written in place: write ${value}`
    },
  )
  if (isDiagnostic(statuses)) {
    handler.errors.push(statuses)
    return []
  }
  const responses: Array<Response> = []
  for (const [status, value] of statuses) {
    if (!/^[0-9]+$/.test(status)) {
      handler.errors.push({
        message: `response status "${status}" must be a number`,
        location: nodeToLocation(value),
      })
      continue
    }
    if (String(Number(status)) !== status) {
      handler.errors.push({
        message: `response status "${status}" must be written as ${Number(status)}`,
        location: nodeToLocation(value),
      })
      continue
    }
    const body = withoutDiagnostic(expressionToBody(value, handler), handler)
    if (body !== undefined) {
      responses.push({ ...body, status: Number(status) })
    }
  }
  return responses
}

function expressionToBody(
  expression: ts.Expression,
  handler: HandlerRead,
): Body | Diagnostic {
  const location = nodeToLocation(expression)
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return { schema: null, location }
  }
  if (
    ts.isArrayLiteralExpression(expression) ||
    ts.isObjectLiteralExpression(expression)
  ) {
    return listToBody(expression, handler)
  }
  if (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression)
  ) {
    const ref = expressionToSchemaRef(expression, handler.context)
    if (isDiagnostic(ref)) {
      return ref
    }
    return { schema: ref.schema, location }
  }
  return unreadableBody(expression)
}

function listToBody(
  expression: ts.ArrayLiteralExpression | ts.ObjectLiteralExpression,
  handler: HandlerRead,
): Body | Diagnostic {
  const list = expressionToList(expression)
  if (list === undefined) {
    return unreadableBody(expression)
  }
  const items = expressionToSchemaRef(list.items, handler.context)
  if (isDiagnostic(items)) {
    return items
  }
  const name = literalOptionToName(list.options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const location = nodeToLocation(expression)
  const derived = listToNamedSchema(items.schema, name, location)
  handler.derived.push(derived)
  return { schema: derived.name, location }
}

function expressionToList(
  expression: ts.ArrayLiteralExpression | ts.ObjectLiteralExpression,
): { items: ts.Expression; options: LiteralOptions } | undefined {
  if (ts.isArrayLiteralExpression(expression)) {
    const [items] = expression.elements
    if (expression.elements.length !== 1 || ts.isSpreadElement(items)) {
      return undefined
    }
    return { items, options: new Map() }
  }
  const options = expressionToLiteralOptions(expression, 'a list body')
  if (isDiagnostic(options)) {
    return undefined
  }
  const items = options.get('list')
  const keys = [...options.keys()]
  if (items === undefined || keys.some((key) => !listKeys.includes(key))) {
    return undefined
  }
  return { items, options }
}

function unreadableBody(expression: ts.Expression): Diagnostic {
  return {
    message: `cannot read "${expression.getText()}" as a body: write a @BidirektSchema class, null, [Schema] or { list: Schema, name: '<name>' }`,
    location: nodeToLocation(expression),
  }
}

function requiredString(
  handler: HandlerRead,
  name: string,
): string | Diagnostic {
  const value = literalOptionToString(handler.options, name)
  if (value === undefined) {
    return missingOption(handler, name)
  }
  return value
}

function missingOption(handler: HandlerRead, name: string): Diagnostic {
  return {
    message: `${handler.what} options must declare "${name}"`,
    location: nodeToLocation(handler.call),
  }
}

function withoutDiagnostic<T>(
  value: T | Diagnostic,
  handler: HandlerRead,
): T | undefined {
  if (isDiagnostic(value)) {
    handler.errors.push(value)
    return undefined
  }
  return value
}
