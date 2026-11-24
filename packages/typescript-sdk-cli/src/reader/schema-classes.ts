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
  literalOptionToDescription,
  literalOptionToName,
  literalOptionToStringLiteral,
  propertyNameToText,
} from './literal-options.ts'
import type { LiteralOptions } from './literal-options.ts'
import { nodeToLocation } from './location.ts'
import {
  builtDeclarationToDiagnostic,
  isLibrarySymbol,
  isObjectDeclaration,
  javaScriptTagHints,
  memberToOwner,
  nodeToSymbol,
  symbolToClass,
  tagHints,
  unreadClassToDiagnostic,
} from './schema-context.ts'
import type {
  FormHints,
  SchemaContext,
  SchemaDeclaration,
  SchemaMember,
} from './schema-context.ts'
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

type DeclarationReading = {
  tags: TagAnnotations
  fieldAnnotations: FieldAnnotations
  parents: Map<SchemaDeclaration, Array<SchemaDeclaration> | Diagnostic>
  context: SchemaContext
  errors: Set<Diagnostic>
}

export type FieldOptions = {
  name?: string
  description?: string
  optional?: boolean
  nullable?: boolean
  declared?: SchemaNode
}

export type TagAnnotations = {
  schemas: Set<SchemaDeclaration>
  fields: Map<SchemaMember, TagField>
  malformedFields: Set<SchemaMember>
}

export type TagField = {
  options: FieldOptions
  location: SourceLocation
}

type FieldAnnotation =
  { from: 'decorator'; call: ts.CallExpression } | ({ from: 'tag' } & TagField)

type FieldAnnotations = Map<SchemaMember, FieldAnnotation>

export function sdkReferencesToSchemas(
  references: Array<SdkReference>,
  tags: TagAnnotations,
  context: SchemaContext,
): ReadSchemas {
  const errors = new Set<Diagnostic>()
  const fieldAnnotations: FieldAnnotations = new Map()
  for (const [field, tagField] of tags.fields) {
    fieldAnnotations.set(field, { from: 'tag', ...tagField })
  }
  const schemaDecorators: Array<[ts.ClassDeclaration, ts.CallExpression]> = []
  for (const reference of references) {
    if (reference.use !== 'decorator') {
      continue
    }
    const element = reference.decorator.parent
    if (ts.isClassDeclaration(element)) {
      schemaDecorators.push([element, reference.call])
    } else if (ts.isPropertyDeclaration(element)) {
      if (fieldAnnotations.get(element)?.from === 'tag') {
        errors.add({
          message:
            '@BidirektField and "@bidirekt field" are both on this property: keep one',
          location: reference.location,
        })
        continue
      }
      fieldAnnotations.set(element, { from: 'decorator', call: reference.call })
    }
  }
  const unreadOptions = new Set<SchemaDeclaration>()
  for (const [declaration, call] of schemaDecorators) {
    if (tags.schemas.has(declaration)) {
      errors.add({
        message:
          '@BidirektSchema and "@bidirekt schema" are both on this class: keep one',
        location: nodeToLocation(call),
      })
      continue
    }
    let name = declaration.name?.text
    const declared = schemaClassToName(declaration, call)
    if (isDiagnostic(declared)) {
      errors.add(declared)
      unreadOptions.add(declaration)
    } else {
      name = declared
    }
    if (name !== undefined) {
      context.schemaDeclarations.set(declaration, name)
    }
  }
  const fields = new Map<SchemaMember, Property | Diagnostic>()
  const schemas: Array<NamedSchema> = []
  const reading: DeclarationReading = {
    tags,
    fieldAnnotations,
    parents: new Map(),
    context,
    errors,
  }
  for (const [declaration, name] of context.schemaDeclarations) {
    const properties: Array<Property> = []
    const declaredFields = declarationToFields(declaration, reading)
    if (
      declaredFields.length === 0 &&
      !unreadOptions.has(declaration) &&
      !hasUnreadFields(declaration, reading)
    ) {
      errors.add({
        message: `schema "${name}" has no field: annotate at least one field with ${schemaToHints(declaration, tags, context).annotateField}`,
        location: nodeToLocation(declaration.name ?? declaration),
      })
    }
    for (const [field, annotation] of declaredFields) {
      if (!fields.has(field)) {
        const read = fieldToProperty(field, annotation, context)
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
    warnings: fieldsOutsideSchemas(reading, [
      ...tags.schemas,
      ...schemaDecorators.map(([declaration]) => declaration),
    ]),
  }
}

function schemaToHints(
  declaration: SchemaDeclaration,
  tags: TagAnnotations,
  context: SchemaContext,
): FormHints {
  if (tags.schemas.has(declaration)) {
    return tagHints
  }
  return context.hints
}

function fieldsOutsideSchemas(
  { fieldAnnotations, parents, context }: DeclarationReading,
  annotatedSchemas: Array<SchemaDeclaration>,
): Array<Diagnostic> {
  const schemasAndParents = new Set<ts.Node>()
  for (const declaration of [...annotatedSchemas, ...parents.keys()]) {
    schemasAndParents.add(declaration)
    if (ts.isInterfaceDeclaration(declaration)) {
      interfaceToBlocks(declaration, context).forEach((block) =>
        schemasAndParents.add(block),
      )
    } else if (ts.isTypeAliasDeclaration(declaration)) {
      schemasAndParents.add(declaration.type)
    }
  }
  return [...fieldAnnotations].flatMap(([field, annotation]) => {
    if (schemasAndParents.has(field.parent)) {
      return []
    }
    if (annotation.from === 'tag') {
      return [tagFieldOutsideSchema(field, annotation.location)]
    }
    if (!ts.isClassLike(field.parent)) {
      return []
    }
    return [
      {
        message: `@BidirektField is in ${declarationToDescription(field.parent)}, which is neither a schema nor the parent of one, so it is not read: add @BidirektSchema to the class`,
        location: nodeToLocation(annotation.call),
      },
    ]
  })
}

function tagFieldOutsideSchema(
  field: SchemaMember,
  location: SourceLocation,
): Diagnostic {
  const owner = memberToOwner(field)
  if (ts.isClassLike(owner) || isObjectDeclaration(owner)) {
    return {
      message: `"@bidirekt field" is in ${declarationToDescription(owner)}, which is neither a schema nor the parent of one, so it is not read: add "@bidirekt schema" above it`,
      location,
    }
  }
  return {
    message:
      '"@bidirekt field" is in an inline object type, so it is not read: move the field to a class, an interface or an object type with "@bidirekt schema" above it',
    location,
  }
}

export function declarationToDescription(
  declaration: ts.ClassLikeDeclaration | SchemaDeclaration,
): string {
  const name = declaration.name?.text
  if (name === undefined) {
    return 'an anonymous class'
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return `interface "${name}"`
  }
  if (ts.isTypeAliasDeclaration(declaration)) {
    return `type "${name}"`
  }
  return `class "${name}"`
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

function declarationToFields(
  declaration: SchemaDeclaration,
  reading: DeclarationReading,
  visited: ReadonlySet<SchemaDeclaration> = new Set(),
): Array<[SchemaMember, FieldAnnotation]> {
  const fields: Array<[SchemaMember, FieldAnnotation]> = []
  let parents = declarationToParents(declaration, reading)
  if (isDiagnostic(parents)) {
    reading.errors.add(parents)
    parents = []
  }
  const inherited = parents
    .filter((parent) => !visited.has(parent))
    .flatMap((parent) =>
      declarationToFields(parent, reading, new Set([...visited, declaration])),
    )
  const own = declarationToMembers(declaration, reading.context).flatMap(
    (member): Array<[SchemaMember, FieldAnnotation]> => {
      const annotation = reading.fieldAnnotations.get(member)
      if (annotation === undefined) {
        return []
      }
      return [[member, annotation]]
    },
  )
  for (const [member, annotation] of [...inherited, ...own]) {
    const name = fieldToMemberName(member)
    const overridden = fields.findIndex(
      ([field]) => fieldToMemberName(field) === name,
    )
    if (overridden === -1) {
      fields.push([member, annotation])
    } else {
      fields[overridden] = [member, annotation]
    }
  }
  return fields
}

function hasUnreadFields(
  declaration: SchemaDeclaration,
  reading: DeclarationReading,
  visited: Set<SchemaDeclaration> = new Set(),
): boolean {
  if (visited.has(declaration)) {
    return false
  }
  visited.add(declaration)
  const parents = reading.parents.get(declaration) ?? []
  if (isDiagnostic(parents)) {
    return true
  }
  return (
    declarationToMembers(declaration, reading.context).some((member) =>
      reading.tags.malformedFields.has(member),
    ) || parents.some((parent) => hasUnreadFields(parent, reading, visited))
  )
}

function fieldToMemberName(field: SchemaMember): string {
  return propertyNameToText(field.name) ?? field.name.getText()
}

function declarationToMembers(
  declaration: SchemaDeclaration,
  context: SchemaContext,
): Array<SchemaMember> {
  if (ts.isClassDeclaration(declaration)) {
    return declaration.members.filter(ts.isPropertyDeclaration)
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return interfaceToBlocks(declaration, context).flatMap((block) =>
      block.members.filter(ts.isPropertySignature),
    )
  }
  if (ts.isTypeLiteralNode(declaration.type)) {
    return declaration.type.members.filter(ts.isPropertySignature)
  }
  return []
}

function interfaceToBlocks(
  declaration: ts.InterfaceDeclaration,
  context: SchemaContext,
): Array<ts.InterfaceDeclaration> {
  const symbol = context.checker.getSymbolAtLocation(declaration.name)
  return (symbol?.declarations ?? [declaration]).filter(
    ts.isInterfaceDeclaration,
  )
}

function declarationToParents(
  declaration: SchemaDeclaration,
  reading: DeclarationReading,
): Array<SchemaDeclaration> | Diagnostic {
  let parents = reading.parents.get(declaration)
  if (parents === undefined) {
    parents = heritageToParents(declaration, {
      ...reading.context,
      hints: schemaToHints(declaration, reading.tags, reading.context),
    })
    reading.parents.set(declaration, parents)
  }
  return parents
}

function heritageToParents(
  declaration: SchemaDeclaration,
  context: SchemaContext,
): Array<SchemaDeclaration> | Diagnostic {
  if (ts.isClassDeclaration(declaration)) {
    const parent = classToParent(declaration, context)
    if (parent === undefined || isDiagnostic(parent)) {
      return parent ?? []
    }
    return [parent]
  }
  if (ts.isTypeAliasDeclaration(declaration)) {
    return []
  }
  const parents: Array<SchemaDeclaration> = []
  for (const block of interfaceToBlocks(declaration, context)) {
    for (const parent of heritageToTypes(block)) {
      const symbol = nodeToSymbol(parent.expression, context)
      const readable = (symbol?.declarations ?? []).filter(isObjectDeclaration)
      if (
        readable.length > 0 &&
        symbol !== undefined &&
        isLibrarySymbol(symbol, context)
      ) {
        continue
      }
      const built = symbol && builtDeclarationToDiagnostic(symbol, context)
      if (built !== undefined) {
        return { ...built, location: nodeToLocation(parent) }
      }
      if (readable.length === 0 || parent.typeArguments !== undefined) {
        return unreadableParent(parent, declaration)
      }
      parents.push(...readable)
    }
  }
  return parents
}

function classToParent(
  declaration: ts.ClassDeclaration,
  context: SchemaContext,
): ts.ClassDeclaration | undefined | Diagnostic {
  const parent = heritageToTypes(declaration).at(0)?.expression
  if (parent === undefined) {
    return undefined
  }
  const symbol = nodeToSymbol(parent, context)
  if (symbol !== undefined && isLibrarySymbol(symbol, context)) {
    return undefined
  }
  const unread = symbol && unreadClassToDiagnostic(symbol, context)
  if (unread !== undefined) {
    return { ...unread, location: nodeToLocation(parent) }
  }
  const parentClass = symbol && symbolToClass(symbol)
  if (
    parentClass === undefined ||
    !(ts.isIdentifier(parent) || ts.isPropertyAccessExpression(parent))
  ) {
    return unreadableParent(parent, declaration)
  }
  return parentClass
}

function heritageToTypes(
  declaration: ts.ClassDeclaration | ts.InterfaceDeclaration,
): ReadonlyArray<ts.ExpressionWithTypeArguments> {
  const extendsClause = declaration.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
  )
  return extendsClause?.types ?? []
}

function unreadableParent(
  parent: ts.Node,
  declaration: SchemaDeclaration,
): Diagnostic {
  return {
    message: `cannot read the parent "${parent.getText()}" of ${declarationToDescription(declaration)}: declare its fields`,
    location: nodeToLocation(parent),
  }
}

function fieldToProperty(
  field: SchemaMember,
  annotation: FieldAnnotation,
  context: SchemaContext,
): Property | Diagnostic {
  const location = nodeToLocation(field.name)
  const options = annotationToFieldOptions(annotation, context)
  if (isDiagnostic(options)) {
    return withLocation(options, location)
  }
  const fieldContext = annotationToContext(annotation, field, context)
  const name = options.name ?? propertyNameToText(field.name)
  if (name === undefined) {
    return {
      message: `cannot name field "${field.name.getText()}": declare it with ${fieldContext.hints.declareName}`,
      location,
    }
  }
  const read = fieldToSchemaNode(field, options, fieldContext)
  if (isDiagnostic(read)) {
    return withLocation(read, location)
  }
  return { name, node: fieldOptionsToNode(read, options), location }
}

export function fieldOptionsToNode(
  read: SchemaNode,
  options: FieldOptions,
): SchemaNode {
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
  return node
}

function annotationToContext(
  annotation: FieldAnnotation,
  field: SchemaMember,
  context: SchemaContext,
): SchemaContext {
  if (annotation.from !== 'tag') {
    return context
  }
  if ((field.flags & ts.NodeFlags.JavaScriptFile) !== 0) {
    return { ...context, hints: javaScriptTagHints }
  }
  return { ...context, hints: tagHints }
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
  field: SchemaMember,
  options: FieldOptions,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  const typeNode = field.type ?? ts.getJSDocType(field)
  if (options.declared !== undefined) {
    const declared = declaredToFieldNode(options.declared, typeNode, context)
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
    message: `cannot read the type of "${field.name.getText()}": write its type or declare it with ${context.hints.declareFieldType}`,
  }
}

function declaredToFieldNode(
  declared: SchemaNode,
  typeNode: ts.TypeNode | undefined,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  if (declared.type !== 'union' || typeNode === undefined) {
    return declared
  }
  return typeNodeToDeclaredUnion(typeNode, declared, context)
}

function declaredToSchemaNode(
  type: ts.StringLiteralLike | undefined,
  union: ts.Expression | undefined,
  context: SchemaContext,
): SchemaNode | Diagnostic {
  if (type === undefined) {
    const members = expressionToUnionMembers(union, '"union"', context)
    if (isDiagnostic(members)) {
      return members
    }
    return { type: 'union', members }
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
  field: SchemaMember,
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

function annotationToFieldOptions(
  annotation: FieldAnnotation,
  context: SchemaContext,
): FieldOptions | Diagnostic {
  if (annotation.from === 'tag') {
    return annotation.options
  }
  const options = expressionToLiteralOptions(
    annotation.call.arguments[0],
    '@BidirektField options',
    ['name', 'description', 'optional', 'nullable', 'type', 'union'],
  )
  if (isDiagnostic(options)) {
    return options
  }
  return literalOptionsToFieldOptions(options, context)
}

function literalOptionsToFieldOptions(
  options: LiteralOptions,
  context: SchemaContext,
): FieldOptions | Diagnostic {
  const name = literalOptionToName(options, 'name')
  if (isDiagnostic(name)) {
    return name
  }
  const description = literalOptionToDescription(options)
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
  const union = options.get('union')
  if (type !== undefined && union !== undefined) {
    return {
      message: 'declare either "type" or "union" in @BidirektField, not both',
    }
  }
  const fieldOptions: FieldOptions = { name, description, optional, nullable }
  if (type === undefined && union === undefined) {
    return fieldOptions
  }
  const declared = declaredToSchemaNode(type, union, context)
  if (isDiagnostic(declared)) {
    return declared
  }
  return { ...fieldOptions, declared }
}
