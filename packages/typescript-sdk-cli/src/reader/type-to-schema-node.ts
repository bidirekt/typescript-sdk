import ts from 'typescript'
import type { NamedSchema, SchemaNode } from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { nodeToLocation } from './location.ts'
import {
  classToSchemaName,
  isDefaultLibrarySymbol,
  isLibrarySymbol,
  nodeToSymbol,
  typeToUntranslatableMessage,
} from './schema-context.ts'
import type { SchemaContext } from './schema-context.ts'

export type NullabilityFlags = {
  nullable: boolean
  optional: boolean
}

export type TranslatedType = {
  node: SchemaNode
  optional: boolean
}

type TypeParts = NullabilityFlags & {
  members: Array<ts.TypeNode>
}

type Walk = {
  expanding: ReadonlySet<ts.TypeAliasDeclaration>
  bindings: ReadonlyMap<ts.Symbol, Bound>
  union: SchemaNode | undefined
}

type Bound = {
  typeNode: ts.TypeNode
  walk: Walk
}

type Alias = {
  declaration: ts.TypeAliasDeclaration
  walk: Walk
}

function startWalk(union: SchemaNode | undefined): Walk {
  return { expanding: new Set(), bindings: new Map(), union }
}

export function typeNodeToFlags(
  typeNode: ts.TypeNode,
  context: SchemaContext,
): NullabilityFlags {
  return walkToFlags(typeNode, context, startWalk(undefined))
}

function walkToFlags(
  typeNode: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): NullabilityFlags {
  const parts = typeNodeToParts(typeNode)
  const flags: NullabilityFlags = {
    nullable: parts.nullable,
    optional: parts.optional,
  }
  for (const member of parts.members) {
    const followed = memberToFollowed(member, context, walk)
    if (followed !== undefined) {
      const inner = walkToFlags(followed.typeNode, context, followed.walk)
      flags.nullable ||= inner.nullable
      flags.optional ||= inner.optional
    }
  }
  return flags
}

function memberToFollowed(
  member: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): Bound | undefined {
  const bound = typeNodeToBound(member, context, walk)
  if (bound !== undefined) {
    return bound
  }
  const alias = typeNodeToAlias(member, context, walk)
  if (alias === undefined || walk.expanding.has(alias.declaration)) {
    return undefined
  }
  return { typeNode: alias.declaration.type, walk: alias.walk }
}

export function typeNodeToDeclaredUnion(
  typeNode: ts.TypeNode,
  union: SchemaNode,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  const translated = walkToTranslatedType(typeNode, context, startWalk(union))
  if (isDiagnostic(translated)) {
    return translated
  }
  if (!hasUnion(translated.node)) {
    return {
      message: `cannot place the "union" of @BidirektField in "${typeNode.getText()}": write a union of classes as its type, its items or its values`,
    }
  }
  return translated.node
}

function hasUnion(node: SchemaNode): boolean {
  switch (node.type) {
    case 'union':
      return true
    case 'array':
      return hasUnion(node.items)
    case 'map':
      return hasUnion(node.values)
  }
  return false
}

function classesToDeclaredUnion(
  classes: Array<ts.Symbol>,
  union: SchemaNode,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  if (union.type !== 'union') {
    return union
  }
  const typeText = classes.map((each) => each.name).join(' | ')
  const schemas: Array<string> = []
  for (const each of classes) {
    const name = classToSchemaName(each, context)
    if (isDiagnostic(name)) {
      return name
    }
    schemas.push(name)
  }
  for (const { node } of union.members) {
    if (node.type === 'ref' && !schemas.includes(node.schema)) {
      return {
        message: `the "union" of @BidirektField lists "${node.schema}", which is not in "${typeText}": remove its key or add it to the type`,
      }
    }
  }
  for (const schema of schemas) {
    const keys = union.members.filter(
      ({ node }) => node.type === 'ref' && node.schema === schema,
    )
    if (keys.length === 0) {
      return {
        message: `the "union" of @BidirektField misses "${schema}" of "${typeText}": add a key for it`,
      }
    }
    if (keys.length > 1) {
      return {
        message: `the "union" of @BidirektField lists "${schema}" more than once: keep one key for it`,
      }
    }
  }
  return union
}

function typeToUnionMembers(type: ts.Type): ReadonlyArray<ts.Type> {
  if (type.isUnion()) {
    return type.types
  }
  return [type]
}

export function typeNodeToTranslatedType(
  typeNode: ts.TypeNode,
  context: SchemaContext,
): TranslatedType | Diagnostic {
  return walkToTranslatedType(typeNode, context, startWalk(undefined))
}

function walkToTranslatedType(
  typeNode: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const parts = typeNodeToParts(typeNode)
  const translated = membersToTranslatedType(
    parts.members,
    typeNode,
    context,
    walk,
  )
  if (isDiagnostic(translated)) {
    return translated
  }
  let node = translated.node
  if (parts.nullable) {
    node = { ...node, nullable: true }
  }
  return { node, optional: parts.optional || translated.optional }
}

function typeNodeToParts(typeNode: ts.TypeNode): TypeParts {
  const parts: TypeParts = { members: [], nullable: false, optional: false }
  const add = (node: ts.TypeNode): void => {
    if (ts.isParenthesizedTypeNode(node)) {
      add(node.type)
      return
    }
    if (ts.isUnionTypeNode(node)) {
      node.types.forEach(add)
      return
    }
    if (
      ts.isLiteralTypeNode(node) &&
      node.literal.kind === ts.SyntaxKind.NullKeyword
    ) {
      parts.nullable = true
      return
    }
    if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      parts.optional = true
      return
    }
    parts.members.push(node)
  }
  add(typeNode)
  return parts
}

function typeNodeToNestedNode(
  typeNode: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): SchemaNode | Diagnostic {
  const translated = walkToTranslatedType(typeNode, context, walk)
  if (isDiagnostic(translated)) {
    return translated
  }
  if (translated.optional) {
    return {
      message: typeToUntranslatableMessage(unparenthesized(typeNode).getText()),
    }
  }
  return translated.node
}

function membersToTranslatedType(
  members: Array<ts.TypeNode>,
  whole: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const classes = membersToClasses(members, context)
  if (walk.union !== undefined && classes !== undefined) {
    const node = classesToDeclaredUnion(classes, walk.union, context)
    if (isDiagnostic(node)) {
      return node
    }
    return { node, optional: false }
  }
  if (members.length === 1) {
    return memberToTranslatedType(members[0], context, walk)
  }
  const literals = membersToStringLiterals(members, context, walk)
  if (literals !== undefined) {
    let node: SchemaNode = { type: 'enum', members: literals.members }
    if (literals.nullable) {
      node = { ...node, nullable: true }
    }
    return { node, optional: literals.optional }
  }
  if (members.length > 1 && members.every(isNumericLiteralType)) {
    return { message: numericLiteralMessage(whole.getText()) }
  }
  if (members.length > 1 && classes !== undefined) {
    return {
      message: `cannot translate union of classes "${whole.getText()}": declare each member's key with @BidirektField({ union })`,
    }
  }
  return { message: typeToUntranslatableMessage(whole.getText()) }
}

function memberToTranslatedType(
  member: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  switch (member.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { node: { type: 'string' }, optional: false }
    case ts.SyntaxKind.NumberKeyword:
      return { node: { type: 'number' }, optional: false }
    case ts.SyntaxKind.BooleanKeyword:
      return { node: { type: 'boolean' }, optional: false }
  }
  if (isStringLiteralType(member)) {
    return {
      node: { type: 'enum', members: [member.literal.text] },
      optional: false,
    }
  }
  if (isNumericLiteralType(member)) {
    return { message: numericLiteralMessage(member.getText()) }
  }
  if (ts.isArrayTypeNode(member)) {
    return arrayToTranslatedType(member.elementType, context, walk)
  }
  if (
    ts.isTypeOperatorNode(member) &&
    member.operator === ts.SyntaxKind.ReadonlyKeyword
  ) {
    return memberToTranslatedType(member.type, context, walk)
  }
  if (ts.isTypeLiteralNode(member)) {
    const values = typeLiteralToMapValues(member, context)
    if (values !== undefined) {
      return mapToTranslatedType(values, context, walk)
    }
    return {
      message: `cannot translate inline object type "${member.getText()}": declare a class with @BidirektSchema and use it as the type`,
    }
  }
  if (ts.isTypeReferenceNode(member)) {
    return referenceToTranslatedType(member, context, walk)
  }
  const literals = typeToStringLiterals(
    context.checker.getTypeFromTypeNode(member),
  )
  if (literals !== undefined) {
    return { node: { type: 'enum', members: literals }, optional: false }
  }
  return { message: typeToUntranslatableMessage(member.getText()) }
}

function referenceToTranslatedType(
  reference: ts.TypeReferenceNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const bound = typeNodeToBound(reference, context, walk)
  if (bound !== undefined) {
    return walkToTranslatedType(bound.typeNode, context, bound.walk)
  }
  const symbol = nodeToSymbol(reference.typeName, context)
  if (symbol === undefined) {
    return { message: typeToUntranslatableMessage(reference.getText()) }
  }
  if (symbol.flags & ts.SymbolFlags.Enum) {
    return enumToTranslatedType(symbol, context)
  }
  if (symbol.flags & ts.SymbolFlags.EnumMember) {
    return enumMemberToTranslatedType(reference, context)
  }
  const alias = typeNodeToAlias(reference, context, walk)
  if (alias !== undefined) {
    return aliasToTranslatedType(alias, context, walk)
  }
  const typeArguments = reference.typeArguments ?? []
  if (isLibrarySymbol(symbol, context)) {
    return libraryReferenceToTranslatedType(
      reference,
      symbol.name,
      typeArguments,
      context,
      walk,
    )
  }
  if (typeArguments.length > 0) {
    return {
      message: `cannot translate generic type "${reference.getText()}": declare a non-generic class with @BidirektSchema and use it as the type`,
    }
  }
  if (symbol.flags & ts.SymbolFlags.Class) {
    return classToTranslatedType(symbol, context)
  }
  if (symbol.flags & ts.SymbolFlags.Interface) {
    return {
      message: `cannot translate interface "${symbol.name}": declare a class with @BidirektSchema and use it as the type`,
    }
  }
  return { message: typeToUntranslatableMessage(reference.getText()) }
}

function libraryReferenceToTranslatedType(
  reference: ts.TypeReferenceNode,
  name: string,
  typeArguments: ReadonlyArray<ts.TypeNode>,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  if (
    (name === 'Array' || name === 'ReadonlyArray') &&
    typeArguments.length === 1
  ) {
    return arrayToTranslatedType(typeArguments[0], context, walk)
  }
  if (name === 'Record' && typeArguments.length === 2) {
    const [key, values] = typeArguments
    if (!isStringType(key, context)) {
      return {
        message: `cannot translate "${reference.getText()}": declare its key as string`,
      }
    }
    return mapToTranslatedType(values, context, walk)
  }
  return { message: typeToUntranslatableMessage(reference.getText()) }
}

function arrayToTranslatedType(
  items: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const node = typeNodeToNestedNode(items, context, walk)
  if (isDiagnostic(node)) {
    return node
  }
  return { node: { type: 'array', items: node }, optional: false }
}

function mapToTranslatedType(
  values: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const node = typeNodeToNestedNode(values, context, walk)
  if (isDiagnostic(node)) {
    return node
  }
  return { node: { type: 'map', values: node }, optional: false }
}

function typeLiteralToMapValues(
  typeLiteral: ts.TypeLiteralNode,
  context: SchemaContext,
): ts.TypeNode | undefined {
  const [member] = typeLiteral.members
  if (
    typeLiteral.members.length !== 1 ||
    !ts.isIndexSignatureDeclaration(member) ||
    member.parameters.length !== 1
  ) {
    return undefined
  }
  const key = member.parameters[0].type
  if (key === undefined || !isStringType(key, context)) {
    return undefined
  }
  return member.type
}

function isStringType(typeNode: ts.TypeNode, context: SchemaContext): boolean {
  const type = context.checker.getTypeFromTypeNode(typeNode)
  return (type.flags & ts.TypeFlags.String) !== 0
}

function classToTranslatedType(
  symbol: ts.Symbol,
  context: SchemaContext,
): TranslatedType | Diagnostic {
  const name = classToSchemaName(symbol, context)
  if (isDiagnostic(name)) {
    return name
  }
  return { node: { type: 'ref', schema: name }, optional: false }
}

function enumToTranslatedType(
  symbol: ts.Symbol,
  context: SchemaContext,
): TranslatedType | Diagnostic {
  const schema = enumToNamedSchema(symbol, symbol.name, context)
  if (schema === undefined) {
    return { node: { type: 'integer' }, optional: false }
  }
  if (isDiagnostic(schema)) {
    return schema
  }
  return { node: { type: 'ref', schema: schema.name }, optional: false }
}

export function enumToNamedSchema(
  symbol: ts.Symbol,
  name: string,
  context: SchemaContext,
): NamedSchema | Diagnostic | undefined {
  const declarations = (symbol.declarations ?? []).filter(ts.isEnumDeclaration)
  const values = declarations.flatMap((declaration) =>
    declaration.members.map((member) =>
      context.checker.getConstantValue(member),
    ),
  )
  if (values.every((value) => typeof value === 'number')) {
    return undefined
  }
  const members = values.filter((value) => typeof value === 'string')
  if (members.length !== values.length) {
    return {
      message: `cannot translate enum "${symbol.name}" with string and numeric members: make all its members strings or all numbers`,
    }
  }
  const [first] = declarations
  const registered = context.namedSchemas.get(first)
  if (registered !== undefined) {
    return registered
  }
  const schema: NamedSchema = {
    name,
    node: { type: 'enum', members: [...new Set(members)] },
    location: nodeToLocation(first.name),
  }
  context.namedSchemas.set(first, schema)
  return schema
}

function enumMemberToTranslatedType(
  reference: ts.TypeReferenceNode,
  context: SchemaContext,
): TranslatedType | Diagnostic {
  const type = context.checker.getTypeFromTypeNode(reference)
  if (type.isStringLiteral()) {
    return { node: { type: 'enum', members: [type.value] }, optional: false }
  }
  return { message: numericLiteralMessage(reference.getText()) }
}

type StringLiterals = NullabilityFlags & {
  members: Array<string>
}

function membersToStringLiterals(
  members: Array<ts.TypeNode>,
  context: SchemaContext,
  walk: Walk,
): StringLiterals | undefined {
  if (members.length === 0) {
    return undefined
  }
  const literals: StringLiterals = {
    members: [],
    nullable: false,
    optional: false,
  }
  for (const member of members) {
    const read = memberToStringLiterals(member, context, walk)
    if (read === undefined) {
      return undefined
    }
    literals.members.push(...read.members)
    literals.nullable ||= read.nullable
    literals.optional ||= read.optional
  }
  return { ...literals, members: [...new Set(literals.members)] }
}

function memberToStringLiterals(
  member: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): StringLiterals | undefined {
  const notNullable = { nullable: false, optional: false }
  if (isStringLiteralType(member)) {
    return { members: [member.literal.text], ...notNullable }
  }
  const followed = memberToFollowed(member, context, walk)
  if (followed !== undefined) {
    const parts = typeNodeToParts(followed.typeNode)
    const read = membersToStringLiterals(parts.members, context, followed.walk)
    if (read === undefined) {
      return undefined
    }
    return {
      members: read.members,
      nullable: read.nullable || parts.nullable,
      optional: read.optional || parts.optional,
    }
  }
  const members = typeToStringLiterals(
    context.checker.getTypeFromTypeNode(member),
  )
  if (members === undefined) {
    return undefined
  }
  return { members, ...notNullable }
}

function typeToStringLiterals(type: ts.Type): Array<string> | undefined {
  const members: Array<string> = []
  for (const member of typeToUnionMembers(type)) {
    if (!member.isStringLiteral()) {
      return undefined
    }
    members.push(member.value)
  }
  return members
}

function aliasToTranslatedType(
  alias: Alias,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const { declaration } = alias
  if (walk.expanding.has(declaration)) {
    return { message: typeToUntranslatableMessage(declaration.name.text) }
  }
  const type = unparenthesized(declaration.type)
  if (ts.isTypeLiteralNode(type)) {
    const values = typeLiteralToMapValues(type, context)
    if (values === undefined) {
      return {
        message: `cannot translate object type "${declaration.name.text}": declare a class with @BidirektSchema and use it as the type`,
      }
    }
    return mapToTranslatedType(values, context, alias.walk)
  }
  return walkToTranslatedType(declaration.type, context, alias.walk)
}

function typeNodeToAlias(
  typeNode: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): Alias | undefined {
  if (!ts.isTypeReferenceNode(typeNode)) {
    return undefined
  }
  const symbol = nodeToSymbol(typeNode.typeName, context)
  if (
    symbol === undefined ||
    !(symbol.flags & ts.SymbolFlags.TypeAlias) ||
    isDefaultLibrarySymbol(symbol, context)
  ) {
    return undefined
  }
  const declaration = symbol.declarations?.find(ts.isTypeAliasDeclaration)
  const parameters = declaration?.typeParameters ?? []
  const typeArguments = typeNode.typeArguments ?? []
  if (declaration === undefined || parameters.length !== typeArguments.length) {
    return undefined
  }
  const bindings = new Map<ts.Symbol, Bound>()
  parameters.forEach((parameter, index) => {
    const parameterSymbol = context.checker.getSymbolAtLocation(parameter.name)
    if (parameterSymbol !== undefined) {
      bindings.set(parameterSymbol, { typeNode: typeArguments[index], walk })
    }
  })
  return {
    declaration,
    walk: {
      expanding: new Set([...walk.expanding, declaration]),
      bindings,
      union: walk.union,
    },
  }
}

function typeNodeToBound(
  typeNode: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): Bound | undefined {
  if (!ts.isTypeReferenceNode(typeNode) || typeNode.typeArguments) {
    return undefined
  }
  const symbol = nodeToSymbol(typeNode.typeName, context)
  if (symbol === undefined) {
    return undefined
  }
  return walk.bindings.get(symbol)
}

function membersToClasses(
  members: ReadonlyArray<ts.TypeNode>,
  context: SchemaContext,
): Array<ts.Symbol> | undefined {
  const classes: Array<ts.Symbol> = []
  for (const member of members) {
    const symbol = memberToClass(member, context)
    if (symbol === undefined) {
      return undefined
    }
    classes.push(symbol)
  }
  if (classes.length === 0) {
    return undefined
  }
  return classes
}

function memberToClass(
  member: ts.TypeNode,
  context: SchemaContext,
): ts.Symbol | undefined {
  if (!ts.isTypeReferenceNode(member) || member.typeArguments) {
    return undefined
  }
  const symbol = nodeToSymbol(member.typeName, context)
  if (symbol === undefined || (symbol.flags & ts.SymbolFlags.Class) === 0) {
    return undefined
  }
  return symbol
}

function isStringLiteralType(
  typeNode: ts.TypeNode,
): typeNode is ts.LiteralTypeNode & { literal: ts.StringLiteral } {
  return ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)
}

function isNumericLiteralType(typeNode: ts.TypeNode): boolean {
  if (!ts.isLiteralTypeNode(typeNode)) {
    return false
  }
  const literal = typeNode.literal
  return (
    ts.isNumericLiteral(literal) ||
    (ts.isPrefixUnaryExpression(literal) &&
      ts.isNumericLiteral(literal.operand))
  )
}

function numericLiteralMessage(text: string): string {
  return `cannot translate numeric literal type "${text}": use string literals or declare it with @BidirektField({ type })`
}

function unparenthesized(typeNode: ts.TypeNode): ts.TypeNode {
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return unparenthesized(typeNode.type)
  }
  return typeNode
}
