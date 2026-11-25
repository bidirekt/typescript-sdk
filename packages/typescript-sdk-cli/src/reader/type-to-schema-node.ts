import ts from 'typescript'
import type { NamedSchema, SchemaNode } from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { nodeToLocation } from './location.ts'
import {
  builtDeclarationToDiagnostic,
  classToDiagnostic,
  classToSchemaName,
  isDefaultLibrarySymbol,
  isLibrarySymbol,
  nodeToSymbol,
  symbolToSchemaName,
  typeToUntranslatableMessage,
} from './schema-context.ts'
import type { FormHints, SchemaContext } from './schema-context.ts'

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
  expanding: ReadonlySet<ts.Declaration>
  bindings: ReadonlyMap<ts.Symbol, Bound>
  union: SchemaNode | undefined
}

type Bound = {
  typeNode: ts.TypeNode
  walk: Walk
}

type Alias = {
  declaration: ts.Declaration
  symbol: ts.Symbol
  type: ts.TypeNode
  walk: Walk
}

type AliasType = {
  declaration: ts.Declaration
  type: ts.TypeNode
  parameters: ReadonlyArray<ts.TypeParameterDeclaration>
}

type Reference = ts.TypeReferenceNode | ts.ImportTypeNode

const boxedPrimitives = ['String', 'Number', 'Boolean']

const listNames = ['Array', 'ReadonlyArray']

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
  return { typeNode: alias.type, walk: alias.walk }
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
      message: `cannot place ${context.hints.placeUnion} in "${typeNode.getText()}": write a union of classes as its type, its items or its values`,
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
  const named: Array<{ schema: string; code: string }> = []
  for (const each of classes) {
    const schema = classToSchemaName(each, context)
    if (isDiagnostic(schema)) {
      return schema
    }
    named.push({ schema, code: each.name })
  }
  const schemas = named.map(({ schema }) => schema)
  const typeText = schemas.join(' | ')
  for (const { node } of union.members) {
    if (node.type === 'ref' && !schemas.includes(node.schema)) {
      const renamed = named.find(({ code }) => code === node.schema)
      let fix = 'remove its key or add it to the type'
      if (renamed !== undefined) {
        fix = `write its name in the contract, "${renamed.schema}"`
      }
      return {
        message: `${context.hints.placeUnion} lists "${node.schema}", which is not in "${typeText}": ${fix}`,
      }
    }
  }
  for (const schema of schemas) {
    const keys = union.members.filter(
      ({ node }) => node.type === 'ref' && node.schema === schema,
    )
    if (keys.length === 0) {
      return {
        message: `${context.hints.placeUnion} misses "${schema}" of "${typeText}": add a key for it`,
      }
    }
    if (keys.length > 1) {
      return {
        message: `${context.hints.placeUnion} lists "${schema}" more than once: keep one key for it`,
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

export function typeNodeToShapedLeaf(
  typeNode: ts.TypeNode,
  leaf: SchemaNode,
  context: SchemaContext,
): TranslatedType | Diagnostic {
  return walkToShapedLeaf(typeNode, leaf, context, startWalk(undefined))
}

function walkToShapedLeaf(
  typeNode: ts.TypeNode,
  leaf: SchemaNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const parts = typeNodeToParts(typeNode)
  let shaped: TranslatedType | Diagnostic = { node: leaf, optional: false }
  if (parts.members.length === 1) {
    shaped = memberToShapedLeaf(parts.members[0], leaf, context, walk)
  }
  if (isDiagnostic(shaped)) {
    return shaped
  }
  let node = shaped.node
  if (parts.nullable) {
    node = { ...node, nullable: true }
  }
  return { node, optional: parts.optional || shaped.optional }
}

function memberToShapedLeaf(
  member: ts.TypeNode,
  leaf: SchemaNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const items = memberToListItems(member, context)
  if (items !== undefined) {
    const node = translatedToNestedNode(
      walkToShapedLeaf(items, leaf, context, walk),
      items,
      context,
    )
    if (isDiagnostic(node)) {
      return node
    }
    return { node: { type: 'array', items: node }, optional: false }
  }
  const followed = memberToFollowed(member, context, walk)
  if (followed !== undefined) {
    return walkToShapedLeaf(followed.typeNode, leaf, context, followed.walk)
  }
  return { node: leaf, optional: false }
}

function memberToListItems(
  member: ts.TypeNode,
  context: SchemaContext,
): ts.TypeNode | undefined {
  if (ts.isArrayTypeNode(member)) {
    return member.elementType
  }
  if (
    ts.isTypeOperatorNode(member) &&
    member.operator === ts.SyntaxKind.ReadonlyKeyword
  ) {
    return memberToListItems(member.type, context)
  }
  if (!isReference(member) || member.typeArguments?.length !== 1) {
    return undefined
  }
  const symbol = referenceToSymbol(member, context)
  if (
    symbol === undefined ||
    !isLibrarySymbol(symbol, context) ||
    !listNames.includes(symbol.name)
  ) {
    return undefined
  }
  return member.typeArguments[0]
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
    if (ts.isJSDocNullableType(node)) {
      parts.nullable = true
      add(node.type)
      return
    }
    if (ts.isJSDocNonNullableType(node)) {
      add(node.type)
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

function translatedToNestedNode(
  translated: TranslatedType | Diagnostic,
  typeNode: ts.TypeNode,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  if (isDiagnostic(translated)) {
    return translated
  }
  if (translated.optional) {
    return {
      message: typeToUntranslatableMessage(
        unparenthesized(typeNode).getText(),
        context.hints,
      ),
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
    return { message: numericLiteralMessage(whole.getText(), context.hints) }
  }
  if (members.length > 1 && classes !== undefined) {
    return {
      message: `cannot translate union of classes "${whole.getText()}": declare each member's key with ${context.hints.declareUnion}`,
    }
  }
  return {
    message: typeToUntranslatableMessage(whole.getText(), context.hints),
  }
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
    return { message: numericLiteralMessage(member.getText(), context.hints) }
  }
  const items = memberToListItems(member, context)
  if (items !== undefined) {
    return arrayToTranslatedType(items, context, walk)
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
      message: `cannot translate inline object type "${member.getText()}": declare a class with ${context.hints.schemaAnnotation} and use it as the type`,
    }
  }
  if (isReference(member)) {
    return referenceToTranslatedType(member, context, walk)
  }
  const literals = typeToStringLiterals(
    context.checker.getTypeFromTypeNode(member),
  )
  if (literals !== undefined) {
    return { node: { type: 'enum', members: literals }, optional: false }
  }
  return {
    message: typeToUntranslatableMessage(member.getText(), context.hints),
  }
}

function referenceToTranslatedType(
  reference: Reference,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const bound = typeNodeToBound(reference, context, walk)
  if (bound !== undefined) {
    return walkToTranslatedType(bound.typeNode, context, bound.walk)
  }
  const symbol = referenceToSymbol(reference, context)
  if (symbol === undefined) {
    return {
      message: typeToUntranslatableMessage(reference.getText(), context.hints),
    }
  }
  const typeArguments = reference.typeArguments ?? []
  const schema = symbolToSchemaName(symbol, context)
  if (schema !== undefined && typeArguments.length === 0) {
    return schemaToRef(schema)
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
      message: `cannot translate generic type "${reference.getText()}": declare a non-generic class with ${context.hints.schemaAnnotation} and use it as the type`,
    }
  }
  if (symbol.flags & ts.SymbolFlags.Class) {
    return classToDiagnostic(symbol, context)
  }
  if (symbol.flags & ts.SymbolFlags.Interface) {
    return (
      builtDeclarationToDiagnostic(symbol, context) ?? {
        message: `cannot translate interface "${symbol.name}": add "@bidirekt schema" above it`,
      }
    )
  }
  return {
    message: typeToUntranslatableMessage(reference.getText(), context.hints),
  }
}

function libraryReferenceToTranslatedType(
  reference: Reference,
  name: string,
  typeArguments: ReadonlyArray<ts.TypeNode>,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  if ((name === 'Record' || name === 'Object') && typeArguments.length === 2) {
    const [key, values] = typeArguments
    if (!isStringType(key, context)) {
      return {
        message: `cannot translate "${reference.getText()}": declare its key as string`,
      }
    }
    return mapToTranslatedType(values, context, walk)
  }
  if (boxedPrimitives.includes(name) && typeArguments.length === 0) {
    return {
      message: `cannot translate "${name}" to a contract type: write "${name.toLowerCase()}" in lowercase`,
    }
  }
  return {
    message: typeToUntranslatableMessage(reference.getText(), context.hints),
  }
}

function arrayToTranslatedType(
  items: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): TranslatedType | Diagnostic {
  const node = translatedToNestedNode(
    walkToTranslatedType(items, context, walk),
    items,
    context,
  )
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
  const node = translatedToNestedNode(
    walkToTranslatedType(values, context, walk),
    values,
    context,
  )
  if (isDiagnostic(node)) {
    return node
  }
  return { node: { type: 'map', values: node }, optional: false }
}

export function typeLiteralToMapValues(
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

function schemaToRef(schema: string): TranslatedType {
  return { node: { type: 'ref', schema }, optional: false }
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
  return schemaToRef(schema.name)
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
  reference: Reference,
  context: SchemaContext,
): TranslatedType | Diagnostic {
  const type = context.checker.getTypeFromTypeNode(reference)
  if (type.isStringLiteral()) {
    return { node: { type: 'enum', members: [type.value] }, optional: false }
  }
  return {
    message: numericLiteralMessage(reference.getText(), context.hints),
  }
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
  if (walk.expanding.has(alias.declaration)) {
    return {
      message: typeToUntranslatableMessage(alias.symbol.name, context.hints),
    }
  }
  const type = unparenthesized(alias.type)
  if (ts.isTypeLiteralNode(type)) {
    const values = typeLiteralToMapValues(type, context)
    if (values === undefined) {
      return (
        builtDeclarationToDiagnostic(alias.symbol, context) ?? {
          message: `cannot translate object type "${alias.symbol.name}": add "@bidirekt schema" above it`,
        }
      )
    }
    return mapToTranslatedType(values, context, alias.walk)
  }
  return walkToTranslatedType(alias.type, context, alias.walk)
}

function typeNodeToAlias(
  typeNode: ts.TypeNode,
  context: SchemaContext,
  walk: Walk,
): Alias | undefined {
  if (!isReference(typeNode)) {
    return undefined
  }
  const symbol = referenceToSymbol(typeNode, context)
  if (
    symbol === undefined ||
    !(symbol.flags & ts.SymbolFlags.TypeAlias) ||
    isDefaultLibrarySymbol(symbol, context)
  ) {
    return undefined
  }
  const found = symbolToAliasType(symbol)
  const typeArguments = typeNode.typeArguments ?? []
  if (found === undefined || found.parameters.length !== typeArguments.length) {
    return undefined
  }
  const { declaration, type, parameters } = found
  const bindings = new Map<ts.Symbol, Bound>()
  parameters.forEach((parameter, index) => {
    const parameterSymbol = context.checker.getSymbolAtLocation(parameter.name)
    if (parameterSymbol !== undefined) {
      bindings.set(parameterSymbol, { typeNode: typeArguments[index], walk })
    }
  })
  return {
    declaration,
    symbol,
    type,
    walk: {
      expanding: new Set([...walk.expanding, declaration]),
      bindings,
      union: walk.union,
    },
  }
}

function symbolToAliasType(symbol: ts.Symbol): AliasType | undefined {
  for (const declaration of symbol.declarations ?? []) {
    if (ts.isTypeAliasDeclaration(declaration)) {
      return {
        declaration,
        type: declaration.type,
        parameters: declaration.typeParameters ?? [],
      }
    }
    const type = typedefToTypeNode(declaration)
    if (type !== undefined) {
      return { declaration, type, parameters: [] }
    }
  }
  return undefined
}

function typedefToTypeNode(
  declaration: ts.Declaration,
): ts.TypeNode | undefined {
  if (
    !ts.isJSDocTypedefTag(declaration) ||
    declaration.typeExpression === undefined ||
    !ts.isJSDocTypeExpression(declaration.typeExpression) ||
    ts.isTypeLiteralNode(unparenthesized(declaration.typeExpression.type))
  ) {
    return undefined
  }
  return declaration.typeExpression.type
}

function isReference(typeNode: ts.TypeNode): typeNode is Reference {
  return (
    ts.isTypeReferenceNode(typeNode) ||
    (ts.isImportTypeNode(typeNode) && !typeNode.isTypeOf)
  )
}

function referenceToSymbol(
  reference: Reference,
  context: SchemaContext,
): ts.Symbol | undefined {
  if (ts.isTypeReferenceNode(reference)) {
    return nodeToSymbol(reference.typeName, context)
  }
  const qualifier = reference.qualifier
  if (qualifier === undefined) {
    return undefined
  }
  if (ts.isQualifiedName(qualifier)) {
    return nodeToSymbol(qualifier.right, context)
  }
  return nodeToSymbol(qualifier, context)
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
  if (!isReference(member) || member.typeArguments) {
    return undefined
  }
  const symbol = referenceToSymbol(member, context)
  if (
    symbol === undefined ||
    ((symbol.flags & ts.SymbolFlags.Class) === 0 &&
      symbolToSchemaName(symbol, context) === undefined)
  ) {
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

function numericLiteralMessage(text: string, hints: FormHints): string {
  return `cannot translate numeric literal type "${text}": use string literals or declare it with ${hints.declareType}`
}

function unparenthesized(typeNode: ts.TypeNode): ts.TypeNode {
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return unparenthesized(typeNode.type)
  }
  return typeNode
}
