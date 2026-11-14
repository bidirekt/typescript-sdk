import ts from 'typescript'
import type {
  NamedSchema,
  Property,
  SchemaNode,
  SourceLocation,
} from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { expressionToUnionMembers } from './expression-to-schema-node.ts'
import {
  expressionToLiteralOptions,
  literalOptionToBoolean,
  literalOptionToName,
  literalOptionToString,
  literalOptionToStringLiteral,
  propertyNameToText,
} from './literal-options.ts'
import type { LiteralOptions } from './literal-options.ts'
import { nodeToLocation } from './location.ts'
import {
  builtClassToDiagnostic,
  isLibrarySymbol,
  nodeToSymbol,
  symbolToClass,
} from './schema-context.ts'
import type { SchemaContext } from './schema-context.ts'
import type { SdkReference } from './sdk-references.ts'
import {
  typeTextToSchemaNode,
  typeTextUsage,
} from './type-text-to-schema-node.ts'
import {
  typeNodeToDeclaredUnion,
  typeNodeToFlags,
  typeNodeToTranslatedType,
} from './type-to-schema-node.ts'
import type { NullabilityFlags } from './type-to-schema-node.ts'

export type ReadSchemas = {
  schemas: Array<NamedSchema>
  errors: Array<Diagnostic>
  warnings: Array<Diagnostic>
}

type FieldDecorators = Map<ts.PropertyDeclaration, ts.CallExpression>

type ClassReading = {
  fieldDecorators: FieldDecorators
  parents: Map<
    ts.ClassDeclaration,
    ts.ClassDeclaration | undefined | Diagnostic
  >
  context: SchemaContext
  errors: Set<Diagnostic>
}

type FieldOptions = {
  name?: string
  description?: string
  optional?: boolean
  nullable?: boolean
  type?: ts.StringLiteralLike
  union?: ts.Expression
}

export function sdkReferencesToSchemas(
  references: Array<SdkReference>,
  context: SchemaContext,
): ReadSchemas {
  const errors = new Set<Diagnostic>()
  const fieldDecorators: FieldDecorators = new Map()
  const schemaDecorators: Array<[ts.ClassDeclaration, ts.CallExpression]> = []
  for (const reference of references) {
    if (reference.use === 'misplaced') {
      continue
    }
    const element = reference.decorator.parent
    if (ts.isClassDeclaration(element)) {
      schemaDecorators.push([element, reference.call])
    } else if (ts.isPropertyDeclaration(element)) {
      fieldDecorators.set(element, reference.call)
    }
  }
  const unreadOptions = new Set<ts.ClassDeclaration>()
  for (const [declaration, call] of schemaDecorators) {
    let name = declaration.name?.text
    const declared = schemaClassToName(declaration, call)
    if (isDiagnostic(declared)) {
      errors.add(declared)
      unreadOptions.add(declaration)
    } else {
      name = declared
    }
    if (name !== undefined) {
      context.schemaClasses.set(declaration, name)
    }
  }
  const fields = new Map<ts.PropertyDeclaration, Property | Diagnostic>()
  const schemas: Array<NamedSchema> = []
  const classes: ClassReading = {
    fieldDecorators,
    parents: new Map(),
    context,
    errors,
  }
  for (const [declaration, name] of context.schemaClasses) {
    const properties: Array<Property> = []
    const declaredFields = classToFields(declaration, classes)
    if (
      declaredFields.length === 0 &&
      !unreadOptions.has(declaration) &&
      !hasUnreadableParent(declaration, classes)
    ) {
      errors.add({
        message: `schema "${name}" has no field: annotate at least one field with @BidirektField`,
        location: nodeToLocation(declaration.name ?? declaration),
      })
    }
    for (const [field, call] of declaredFields) {
      if (!fields.has(field)) {
        const read = fieldToProperty(field, call, context)
        fields.set(field, read)
        if (isDiagnostic(read)) {
          errors.add(read)
        }
      }
      const read = fields.get(field)
      if (read !== undefined && !isDiagnostic(read)) {
        properties.push(read)
      }
    }
    schemas.push({
      name,
      node: { type: 'object', properties },
      location: nodeToLocation(declaration.name ?? declaration),
    })
  }
  return {
    schemas: [...schemas, ...context.namedSchemas.values()],
    errors: [...errors],
    warnings: fieldsOutsideSchemas(classes, schemaDecorators),
  }
}

function fieldsOutsideSchemas(
  { fieldDecorators, parents }: ClassReading,
  schemaDecorators: Array<[ts.ClassDeclaration, ts.CallExpression]>,
): Array<Diagnostic> {
  const schemasAndParents = new Set<ts.Node>([
    ...parents.keys(),
    ...schemaDecorators.map(([declaration]) => declaration),
  ])
  return [...fieldDecorators]
    .filter(([field]) => !schemasAndParents.has(field.parent))
    .map(([field, call]) => ({
      message: `@BidirektField is in ${classToDescription(field.parent)}, which is neither a schema nor the parent of one, so it is not read: add @BidirektSchema to the class`,
      location: nodeToLocation(call),
    }))
}

function classToDescription(declaration: ts.ClassLikeDeclaration): string {
  if (declaration.name === undefined) {
    return 'an anonymous class'
  }
  return `class "${declaration.name.text}"`
}

function schemaClassToName(
  declaration: ts.ClassDeclaration,
  call: ts.CallExpression,
): string | Diagnostic {
  const options = expressionToLiteralOptions(
    call.arguments[0],
    '@BidirektSchema options',
    ['name'],
  )
  if (isDiagnostic(options)) {
    return options
  }
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const resolved = name ?? declaration.name?.text
  if (resolved === undefined) {
    return {
      message:
        'cannot name an anonymous class: declare it with @BidirektSchema({ name })',
      location: nodeToLocation(declaration),
    }
  }
  return resolved
}

function classToFields(
  declaration: ts.ClassDeclaration,
  classes: ClassReading,
  visited: ReadonlySet<ts.ClassDeclaration> = new Set(),
): Array<[ts.PropertyDeclaration, ts.CallExpression]> {
  const parent = classToParent(declaration, classes)
  let fields: Array<[ts.PropertyDeclaration, ts.CallExpression]> = []
  if (isDiagnostic(parent)) {
    classes.errors.add(parent)
  } else if (parent !== undefined && !visited.has(parent)) {
    fields = classToFields(parent, classes, new Set([...visited, declaration]))
  }
  for (const member of declaration.members) {
    if (!ts.isPropertyDeclaration(member)) {
      continue
    }
    const call = classes.fieldDecorators.get(member)
    if (call === undefined) {
      continue
    }
    const name = fieldToMemberName(member)
    const inherited = fields.findIndex(
      ([field]) => fieldToMemberName(field) === name,
    )
    if (inherited === -1) {
      fields.push([member, call])
    } else {
      fields[inherited] = [member, call]
    }
  }
  return fields
}

function hasUnreadableParent(
  declaration: ts.ClassDeclaration,
  { parents }: ClassReading,
): boolean {
  const visited = new Set<ts.ClassDeclaration>()
  let current: ts.ClassDeclaration | undefined = declaration
  while (current !== undefined && !visited.has(current)) {
    visited.add(current)
    const parent = parents.get(current)
    if (isDiagnostic(parent)) {
      return true
    }
    current = parent
  }
  return false
}

function fieldToMemberName(field: ts.PropertyDeclaration): string {
  return propertyNameToText(field.name) ?? field.name.getText()
}

function classToParent(
  declaration: ts.ClassDeclaration,
  classes: ClassReading,
): ts.ClassDeclaration | undefined | Diagnostic {
  if (!classes.parents.has(declaration)) {
    classes.parents.set(
      declaration,
      heritageToParent(declaration, classes.context),
    )
  }
  return classes.parents.get(declaration)
}

function heritageToParent(
  declaration: ts.ClassDeclaration,
  context: SchemaContext,
): ts.ClassDeclaration | undefined | Diagnostic {
  const extendsClause = declaration.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
  )
  const parent = extendsClause?.types[0]?.expression
  if (parent === undefined) {
    return undefined
  }
  const symbol = nodeToSymbol(parent, context)
  if (symbol !== undefined && isLibrarySymbol(symbol, context)) {
    return undefined
  }
  const builtClass = symbol && builtClassToDiagnostic(symbol, context)
  if (builtClass !== undefined) {
    return { ...builtClass, location: nodeToLocation(parent) }
  }
  const parentClass = symbol && symbolToClass(symbol)
  if (
    parentClass === undefined ||
    !(ts.isIdentifier(parent) || ts.isPropertyAccessExpression(parent))
  ) {
    return {
      message: `cannot read the parent "${parent.getText()}" of ${classToDescription(declaration)}: declare its fields`,
      location: nodeToLocation(parent),
    }
  }
  return parentClass
}

function fieldToProperty(
  field: ts.PropertyDeclaration,
  call: ts.CallExpression,
  context: SchemaContext,
): Property | Diagnostic {
  const location = nodeToLocation(field.name)
  const options = callToFieldOptions(call)
  if (isDiagnostic(options)) {
    return options
  }
  const name = options.name ?? propertyNameToText(field.name)
  if (name === undefined) {
    return {
      message: `cannot name field "${field.name.getText()}": declare it with @BidirektField({ name })`,
      location,
    }
  }
  const read = fieldToSchemaNode(field, options, context)
  if (isDiagnostic(read)) {
    return withLocation(read, location)
  }
  const node: SchemaNode = { ...read }
  delete node.optional
  delete node.nullable
  if (options.optional ?? read.optional) {
    node.optional = true
  }
  if (options.nullable ?? read.nullable) {
    node.nullable = true
  }
  if (options.description !== undefined) {
    node.description = options.description
  }
  return { name, node, location }
}

function withLocation(
  diagnostic: Diagnostic,
  location: SourceLocation,
): Diagnostic {
  if (diagnostic.location !== undefined) {
    return diagnostic
  }
  return { ...diagnostic, location }
}

function fieldToSchemaNode(
  field: ts.PropertyDeclaration,
  options: FieldOptions,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  const typeNode = field.type ?? ts.getJSDocType(field)
  if (options.type !== undefined && options.union !== undefined) {
    return {
      message: 'declare either "type" or "union" in @BidirektField, not both',
    }
  }
  if (options.type !== undefined || options.union !== undefined) {
    const declared = declaredToSchemaNode(options, typeNode, context)
    if (isDiagnostic(declared)) {
      return declared
    }
    const flags = fieldToFlags(field, typeNode, context)
    return {
      ...declared,
      optional: declared.optional ?? flags.optional,
      nullable: declared.nullable ?? flags.nullable,
    }
  }
  if (typeNode !== undefined) {
    const translated = typeNodeToTranslatedType(typeNode, context)
    if (isDiagnostic(translated)) {
      return translated
    }
    return {
      ...translated.node,
      optional: translated.optional || field.questionToken !== undefined,
    }
  }
  return {
    message: `cannot read the type of "${field.name.getText()}": write its type or declare it with @BidirektField({ type })`,
  }
}

function declaredToSchemaNode(
  options: FieldOptions,
  typeNode: ts.TypeNode | undefined,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  const type = options.type
  if (type === undefined) {
    const members = expressionToUnionMembers(options.union, '"union"', context)
    if (isDiagnostic(members)) {
      return members
    }
    if (typeNode === undefined) {
      return { type: 'union', members }
    }
    return typeNodeToDeclaredUnion(
      typeNode,
      { type: 'union', members },
      context,
    )
  }
  const node = typeTextToSchemaNode(type.text)
  if (node === undefined) {
    return {
      message: `cannot read type "${type.text}": write ${typeTextUsage}`,
      location: nodeToLocation(type),
    }
  }
  return node
}

function fieldToFlags(
  field: ts.PropertyDeclaration,
  typeNode: ts.TypeNode | undefined,
  context: SchemaContext,
): NullabilityFlags {
  let flags: NullabilityFlags = { nullable: false, optional: false }
  if (typeNode !== undefined) {
    flags = typeNodeToFlags(typeNode, context)
  }
  return {
    nullable: flags.nullable,
    optional: flags.optional || field.questionToken !== undefined,
  }
}

function callToFieldOptions(
  call: ts.CallExpression,
): FieldOptions | Diagnostic {
  const options = expressionToLiteralOptions(
    call.arguments[0],
    '@BidirektField options',
    ['name', 'description', 'optional', 'nullable', 'type', 'union'],
  )
  if (isDiagnostic(options)) {
    return options
  }
  return literalOptionsToFieldOptions(options)
}

function literalOptionsToFieldOptions(
  options: LiteralOptions,
): FieldOptions | Diagnostic {
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const description = literalOptionToString(options, 'description')
  if (isDiagnostic(description)) {
    return description
  }
  const optional = literalOptionToBoolean(options, 'optional')
  if (isDiagnostic(optional)) {
    return optional
  }
  const nullable = literalOptionToBoolean(options, 'nullable')
  if (isDiagnostic(nullable)) {
    return nullable
  }
  const type = literalOptionToStringLiteral(options, 'type')
  if (isDiagnostic(type)) {
    return type
  }
  return {
    name,
    description,
    optional,
    nullable,
    type,
    union: options.get('union'),
  }
}
