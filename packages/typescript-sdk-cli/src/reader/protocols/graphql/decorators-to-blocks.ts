import ts from 'typescript'
import type { SourceLocation } from '../../../model/contract.ts'
import { isDiagnostic } from '../../../model/diagnostic.ts'
import type { Diagnostic } from '../../../model/diagnostic.ts'
import type {
  GraphqlBlock,
  Operation,
  OperationKind,
  ReturnedType,
  Returns,
  SchemaUse,
} from '../../../model/protocols/graphql/contract.ts'
import { returnsToSchema } from '../../../model/protocols/graphql/returns-to-schema.ts'
import type { ProtocolRead } from '../../../protocols.ts'
import {
  expressionToSchemaRef,
  expressionToUnionMembers,
} from '../../expression-to-schema-node.ts'
import {
  expressionToLiteralOptions,
  literalOptionToBoolean,
  literalOptionToName,
  literalOptionToString,
} from '../../literal-options.ts'
import type { LiteralOptions } from '../../literal-options.ts'
import { nodeToLocation } from '../../location.ts'
import type { SchemaContext } from '../../schema-context.ts'
import { fieldTarget } from '../../sdk-references.ts'
import type { DecoratorTarget, SdkDecorator } from '../../sdk-references.ts'
import { textToPrimitive } from '../../type-text-to-schema-node.ts'

export const graphqlDecoratorTargets: Record<string, DecoratorTarget> = {
  BidirektGraphqlConsumer: {
    isTarget: ts.isMethodDeclaration,
    description: 'a method',
  },
  BidirektGraphqlField: fieldTarget,
  BidirektGraph: {
    isTarget: ts.isClassDeclaration,
    description: 'a class declaration',
  },
}

const consumerOptions = [
  'provider',
  'query',
  'mutation',
  'arguments',
  'returns',
]

const listKeys = ['list', 'nullable', 'nullableItems', 'name']

const nullableKeys = ['nullable', 'name']

const scalarKeys = ['scalar', 'name']

const primitiveKeys = ['type', 'name']

const enumKeys = ['enum', 'name']

const unionKeys = ['union', 'name']

type Wrapper = 'nullable' | 'list'

const wrapperPlaces: Record<Wrapper, string> = {
  nullable: '"nullable"',
  list: 'the list',
}

export function sdkDecoratorsToBlocks(
  decorators: Array<SdkDecorator>,
  context: SchemaContext,
): ProtocolRead<GraphqlBlock> {
  const read: ProtocolRead<GraphqlBlock> = {
    blocks: [],
    derived: [],
    errors: [],
  }
  for (const decorator of decorators) {
    if (decorator.name === 'BidirektGraphqlConsumer') {
      consumerToRead(decorator, context, read)
    } else if (decorator.name === 'BidirektGraph') {
      graphToRead(decorator, read)
    }
  }
  return read
}

function consumerToRead(
  { name, call }: SdkDecorator,
  context: SchemaContext,
  read: ProtocolRead<GraphqlBlock>,
): void {
  const what = `@${name} options`
  const options = expressionToLiteralOptions(
    call.arguments[0],
    what,
    consumerOptions,
  )
  if (isDiagnostic(options)) {
    read.errors.push(options)
    return
  }
  const location = nodeToLocation(call)
  const errors: Array<Diagnostic> = []
  const withoutDiagnostic = <T>(value: T | Diagnostic): T | undefined => {
    if (isDiagnostic(value)) {
      errors.push(value)
      return undefined
    }
    return value
  }
  const provider = withoutDiagnostic(
    literalOptionToString(options, 'provider') ?? {
      message: `${what} must declare "provider"`,
      location,
    },
  )
  const operation = withoutDiagnostic(optionsToOperation(options, what, call))
  const argumentsExpression = options.get('arguments')
  let argumentsUse: SchemaUse | undefined
  if (argumentsExpression !== undefined) {
    argumentsUse = withoutDiagnostic(
      expressionToSchemaUse(argumentsExpression, context),
    )
  }
  const returnsExpression = options.get('returns')
  let returns: Returns | undefined
  if (returnsExpression === undefined) {
    errors.push({ message: `${what} must declare "returns"`, location })
  } else {
    returns = withoutDiagnostic(expressionToReturns(returnsExpression, context))
  }
  read.errors.push(...errors)
  if (
    provider === undefined ||
    operation === undefined ||
    returnsExpression === undefined ||
    returns === undefined ||
    errors.length > 0
  ) {
    return
  }
  consumedToRead(
    {
      provider,
      ...operation,
      arguments: argumentsUse,
      returns,
      returnsLocation: nodeToLocation(returnsExpression),
      location,
    },
    read,
  )
}

export type ConsumedOperation = {
  provider: string
  kind: OperationKind
  name: string
  arguments?: SchemaUse
  returns: Returns
  returnsLocation: SourceLocation
  location: SourceLocation
}

export function consumedToRead(
  {
    provider,
    kind,
    name,
    arguments: argumentsUse,
    returns,
    returnsLocation,
    location,
  }: ConsumedOperation,
  read: ProtocolRead<GraphqlBlock>,
): void {
  const { schema, derived } = returnsToSchema(returns, returnsLocation)
  read.derived.push(...derived)
  const operation: Operation = {
    kind,
    name,
    returns: { schema, location: returnsLocation },
    location,
  }
  if (argumentsUse !== undefined) {
    operation.arguments = argumentsUse
  }
  read.blocks.push({ provider, block: { operations: [operation] } })
}

function optionsToOperation(
  options: LiteralOptions,
  what: string,
  call: ts.CallExpression,
): { kind: OperationKind; name: string } | Diagnostic {
  const query = literalOptionToString(options, 'query')
  const mutation = literalOptionToString(options, 'mutation')
  if (isDiagnostic(query)) {
    return query
  }
  if (isDiagnostic(mutation)) {
    return mutation
  }
  if (query !== undefined && mutation !== undefined) {
    return {
      message: `${what} declare both "query" and "mutation": write one`,
      location: nodeToLocation(call),
    }
  }
  if (query !== undefined) {
    return { kind: 'query', name: query }
  }
  if (mutation !== undefined) {
    return { kind: 'mutation', name: mutation }
  }
  return {
    message: `${what} must declare "query" or "mutation"`,
    location: nodeToLocation(call),
  }
}

function graphToRead(
  { name, call }: SdkDecorator,
  read: ProtocolRead<GraphqlBlock>,
): void {
  const [graph] = call.arguments
  const location = nodeToLocation(call)
  if (call.arguments.length !== 1 || !ts.isStringLiteralLike(graph)) {
    read.errors.push({
      message: `@${name} needs the graph name as a string literal written in place: write @${name}('<name>')`,
      location,
    })
    return
  }
  if (graph.text === '') {
    read.errors.push({
      message: `the graph name of @${name} is empty: write @${name}('<name>')`,
      location,
    })
    return
  }
  read.blocks.push({
    block: { operations: [], graph: { name: graph.text, location } },
  })
}

function expressionToSchemaUse(
  expression: ts.Expression,
  context: SchemaContext,
): SchemaUse | Diagnostic {
  const ref = expressionToSchemaRef(expression, context)
  if (isDiagnostic(ref)) {
    return ref
  }
  return { schema: ref.schema, location: nodeToLocation(expression) }
}

function expressionToReturns(
  expression: ts.Expression,
  context: SchemaContext,
): Returns | Diagnostic {
  if (ts.isStringLiteralLike(expression) && expression.text.endsWith('[]')) {
    const type = textToReturnedPrimitive(expression.text.slice(0, -'[]'.length))
    if (type === undefined) {
      return unreadableReturns(expression)
    }
    return { form: 'list', type, nullable: false, nullableItems: false }
  }
  if (ts.isArrayLiteralExpression(expression)) {
    const [items] = expression.elements
    if (expression.elements.length !== 1 || ts.isSpreadElement(items)) {
      return unreadableReturns(expression)
    }
    const type = expressionToReturnedType(items, context, 'list')
    if (isDiagnostic(type)) {
      return type
    }
    return { form: 'list', type, nullable: false, nullableItems: false }
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const options = expressionToLiteralOptions(expression, '"returns"')
    if (isDiagnostic(options)) {
      return options
    }
    if (options.has('list')) {
      return optionsToList(options, expression, context)
    }
    if (options.has('nullable')) {
      return optionsToNullable(options, expression, context)
    }
    if (options.has('scalar') && hasOnlyKeys(options, scalarKeys)) {
      return optionsToScalarReturns(options, expression)
    }
    if (options.has('type') && hasOnlyKeys(options, primitiveKeys)) {
      return optionsToPrimitiveReturns(options, expression)
    }
  }
  const type = expressionToReturnedType(expression, context)
  if (isDiagnostic(type)) {
    return type
  }
  return { form: 'type', type }
}

function optionsToList(
  options: LiteralOptions,
  expression: ts.Expression,
  context: SchemaContext,
): Returns | Diagnostic {
  const items = options.get('list')
  if (items === undefined || !hasOnlyKeys(options, listKeys)) {
    return unreadableReturns(expression)
  }
  const type = expressionToReturnedType(items, context, 'list')
  if (isDiagnostic(type)) {
    return type
  }
  const nullable = literalOptionToBoolean(options, 'nullable')
  if (isDiagnostic(nullable)) {
    return nullable
  }
  const nullableItems = literalOptionToBoolean(options, 'nullableItems')
  if (isDiagnostic(nullableItems)) {
    return nullableItems
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const returns: Returns = {
    form: 'list',
    type,
    nullable: nullable ?? false,
    nullableItems: nullableItems ?? false,
  }
  if (name !== undefined) {
    returns.name = name
  }
  return returns
}

function optionsToNullable(
  options: LiteralOptions,
  expression: ts.Expression,
  context: SchemaContext,
): Returns | Diagnostic {
  const nullable = options.get('nullable')
  if (nullable === undefined || !hasOnlyKeys(options, nullableKeys)) {
    return unreadableReturns(expression)
  }
  const type = expressionToReturnedType(nullable, context, 'nullable')
  if (isDiagnostic(type)) {
    return type
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const returns: Returns = { form: 'nullable', type }
  if (name !== undefined) {
    returns.name = name
  }
  return returns
}

function optionsToScalarReturns(
  options: LiteralOptions,
  expression: ts.Expression,
): Returns | Diagnostic {
  const type = optionsToScalar(options, expression)
  if (isDiagnostic(type)) {
    return type
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const returns: Returns = { form: 'type', type }
  if (name !== undefined) {
    returns.name = name
  }
  return returns
}

function optionsToPrimitiveReturns(
  options: LiteralOptions,
  expression: ts.Expression,
): Returns | Diagnostic {
  const written = options.get('type')
  if (written === undefined || !ts.isStringLiteralLike(written)) {
    return unreadableReturns(expression)
  }
  const type = textToReturnedPrimitive(written.text)
  if (type === undefined) {
    return unreadableReturns(expression)
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const returns: Returns = { form: 'type', type }
  if (name !== undefined) {
    returns.name = name
  }
  return returns
}

function expressionToReturnedType(
  expression: ts.Expression,
  context: SchemaContext,
  wrapper?: Wrapper,
): ReturnedType | Diagnostic {
  if (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression)
  ) {
    const ref = expressionToSchemaRef(expression, context)
    if (isDiagnostic(ref)) {
      return ref
    }
    return { kind: 'schema', schema: ref.schema }
  }
  if (ts.isStringLiteralLike(expression)) {
    return (
      textToReturnedPrimitive(expression.text) ?? unreadableReturns(expression)
    )
  }
  if (!ts.isObjectLiteralExpression(expression)) {
    return unreadableReturns(expression)
  }
  const options = expressionToLiteralOptions(expression, '"returns"')
  if (isDiagnostic(options)) {
    return options
  }
  if (options.has('scalar') && hasOnlyKeys(options, scalarKeys)) {
    return optionsToScalar(options, expression, wrapper)
  }
  if (options.has('enum') && hasOnlyKeys(options, enumKeys)) {
    return optionsToEnum(options, expression)
  }
  if (options.has('union') && hasOnlyKeys(options, unionKeys)) {
    return optionsToUnion(options, expression, context)
  }
  return unreadableReturns(expression)
}

function optionsToScalar(
  options: LiteralOptions,
  expression: ts.Expression,
  wrapper?: Wrapper,
): ReturnedType | Diagnostic {
  const scalar = literalOptionToName(options, 'scalar')
  if (isDiagnostic(scalar)) {
    return scalar
  }
  if (scalar === undefined) {
    return unreadableReturns(expression)
  }
  if (wrapper === undefined || !options.has('name')) {
    return { kind: 'scalar', scalar }
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  return {
    message: `a scalar's "name" goes on ${wrapperPlaces[wrapper]}: write { ${wrapper}: { scalar: '${scalar}' }, name: '${name}' }`,
    location: nodeToLocation(expression),
  }
}

function optionsToEnum(
  options: LiteralOptions,
  expression: ts.Expression,
): ReturnedType | Diagnostic {
  const written = options.get('enum') ?? expression
  const members = expressionToStringLiterals(written)
  if (members === undefined) {
    return {
      message: '"enum" must be an array of string literals written in place',
      location: nodeToLocation(written),
    }
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  if (name === undefined) {
    return {
      message: `an enum in "returns" needs a name: write { enum: [...], name: '<name>' }`,
      location: nodeToLocation(expression),
    }
  }
  return {
    kind: 'schema',
    schema: name,
    declared: { type: 'enum', members },
  }
}

function optionsToUnion(
  options: LiteralOptions,
  expression: ts.Expression,
  context: SchemaContext,
): ReturnedType | Diagnostic {
  const members = expressionToUnionMembers(
    options.get('union'),
    '"union"',
    context,
  )
  if (isDiagnostic(members)) {
    return members
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  if (name === undefined) {
    return {
      message: `a union in "returns" needs a name: write { union: {...}, name: '<name>' }`,
      location: nodeToLocation(expression),
    }
  }
  return {
    kind: 'schema',
    schema: name,
    declared: { type: 'union', members },
  }
}

function expressionToStringLiterals(
  expression: ts.Expression,
): Array<string> | undefined {
  if (!ts.isArrayLiteralExpression(expression)) {
    return undefined
  }
  const members: Array<string> = []
  for (const element of expression.elements) {
    if (!ts.isStringLiteralLike(element)) {
      return undefined
    }
    members.push(element.text)
  }
  return members
}

function textToReturnedPrimitive(text: string): ReturnedType | undefined {
  const type = textToPrimitive(text)
  if (type === undefined) {
    return undefined
  }
  return { kind: 'primitive', type }
}

function hasOnlyKeys(
  options: LiteralOptions,
  keys: ReadonlyArray<string>,
): boolean {
  return [...options.keys()].every((key) => keys.includes(key))
}

function unreadableReturns(expression: ts.Expression): Diagnostic {
  return {
    message: `cannot read "${expression.getText()}" as returns: write a @BidirektSchema class, a primitive such as 'boolean', { type: '<primitive>', name: '<name>' }, [Schema], { list: Schema }, { nullable: Schema }, { scalar: '<name>' }, { enum: [...], name: '<name>' } or { union: {...}, name: '<name>' }`,
    location: nodeToLocation(expression),
  }
}
