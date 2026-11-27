import ts from 'typescript'
import type { NamedSchema, SourceLocation } from '../../../model/contract.ts'
import { isDiagnostic } from '../../../model/diagnostic.ts'
import type { Diagnostic } from '../../../model/diagnostic.ts'
import type {
  Body,
  Resource,
  Response,
} from '../../../model/protocols/rest/contract.ts'
import { listToNamedSchema } from '../../../model/protocols/rest/schema-names.ts'
import type { ProtocolRead, SideBlock } from '../../../protocols.ts'
import { expressionToSchemaRef } from '../../expression-to-schema-node.ts'
import {
  computedKeyToValue,
  expressionToLiteralOptions,
  literalOptionToName,
  literalOptionToString,
} from '../../literal-options.ts'
import type { LiteralOptions } from '../../literal-options.ts'
import { nodeToLocation } from '../../location.ts'
import type { SchemaContext } from '../../schema-context.ts'
import type { DecoratorTarget, SdkDecorator } from '../../sdk-references.ts'

type HandlerRead = {
  options: LiteralOptions
  what: string
  call: ts.CallExpression
  context: SchemaContext
  derived: Array<NamedSchema>
  errors: Array<Diagnostic>
}

export const restDecoratorTargets: Record<string, DecoratorTarget> = {
  BidirektRestProvider: {
    isTarget: ts.isMethodDeclaration,
    description: 'a method',
  },
  BidirektRestConsumer: {
    isTarget: ts.isMethodDeclaration,
    description: 'a method',
  },
}

export const restRenamedExports: Record<string, string> = {
  BidirektProvider: 'BidirektRestProvider',
  BidirektConsumer: 'BidirektRestConsumer',
  BidirektProviderOptions: 'BidirektRestProviderOptions',
  BidirektConsumerOptions: 'BidirektRestConsumerOptions',
  BidirektHttpMethod: 'BidirektRestHttpMethod',
}

const listKeys = ['list', 'name']

const handlerOptions: Record<string, Array<string>> = {
  BidirektRestProvider: ['method', 'path', 'request', 'responses'],
  BidirektRestConsumer: ['provider', 'method', 'path', 'request', 'responses'],
}

export function sdkDecoratorsToResources(
  decorators: Array<SdkDecorator>,
  context: SchemaContext,
): ProtocolRead<Array<Resource>> {
  const read: ProtocolRead<Array<Resource>> = {
    blocks: [],
    derived: [],
    errors: [],
  }
  for (const { name, call } of decorators) {
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
    if (name === 'BidirektRestConsumer') {
      provider = withoutDiagnostic(requiredString(handler, 'provider'), handler)
    }
    const declared = handlerToDeclared(handler)
    read.errors.push(...handler.errors)
    if (declared === undefined) {
      continue
    }
    declaredToRead({ ...declared, provider }, handler.derived, read)
  }
  return read
}

export type DeclaredResource = {
  provider?: string
  method: string
  path: string
  request?: Body
  responses: Array<Response>
  location: SourceLocation
}

export function declaredToRead(
  { provider, request, ...declared }: DeclaredResource,
  derived: Array<NamedSchema>,
  read: ProtocolRead<Array<Resource>>,
): void {
  read.derived.push(...derived)
  const resource: Resource = declared
  if (request !== undefined) {
    resource.request = request
  }
  const sideBlock: SideBlock<Array<Resource>> = { block: [resource] }
  if (provider !== undefined) {
    sideBlock.provider = provider
  }
  read.blocks.push(sideBlock)
}

function handlerToDeclared(handler: HandlerRead): DeclaredResource | undefined {
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
  return {
    method,
    path,
    request,
    responses,
    location: nodeToLocation(handler.call),
  }
}

function handlerToMethod(handler: HandlerRead): string | Diagnostic {
  const method = requiredString(handler, 'method')
  if (isDiagnostic(method)) {
    return method
  }
  return (
    methodToUppercaseDiagnostic(
      method,
      nodeToLocation(handler.options.get('method') ?? handler.call),
    ) ?? method
  )
}

export function methodToUppercaseDiagnostic(
  method: string,
  location: SourceLocation,
): Diagnostic | undefined {
  if (method === method.toUpperCase()) {
    return undefined
  }
  return {
    message: `method "${method}" must be uppercase: write "${method.toUpperCase()}"`,
    location,
  }
}

export function statusToNumberDiagnostic(
  status: string,
  location: SourceLocation,
): Diagnostic | undefined {
  if (!/^[0-9]+$/.test(status)) {
    return { message: `response status "${status}" must be a number`, location }
  }
  if (String(Number(status)) !== status) {
    return {
      message: `response status "${status}" must be written as ${Number(status)}`,
      location,
    }
  }
  return undefined
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
    const number = statusToNumberDiagnostic(status, nodeToLocation(value))
    if (number !== undefined) {
      handler.errors.push(number)
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
