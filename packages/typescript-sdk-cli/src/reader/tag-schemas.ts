import ts from 'typescript'
import type { UnionMember } from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { argumentToOption, isHandlerTag } from './comment-tags.ts'
import { namesToChoice } from './literal-options.ts'
import type { CommentTag, TaggedComment } from './comment-tags.ts'
import { declarationToDescription } from './schema-classes.ts'
import type { FieldOptions, TagAnnotations } from './schema-classes.ts'
import {
  isObjectDeclaration,
  isShadowedByScript,
  memberToOwner,
} from './schema-context.ts'
import type { SchemaContext, SchemaDeclaration } from './schema-context.ts'
import { isStatic } from './sdk-references.ts'
import {
  isSchemaName,
  tagTypeTextToSchemaNode,
  tagTypeTextUsage,
} from './type-text-to-schema-node.ts'
import {
  enumToNamedSchema,
  typeLiteralToMapValues,
} from './type-to-schema-node.ts'

export type ReadTagSchemas = TagAnnotations & {
  errors: Array<Diagnostic>
  warnings: Array<Diagnostic>
}

type TaggedElements = {
  schemas: Set<ts.Node | ts.Symbol>
  fields: Set<ts.Node>
}

const optionUsages: Record<string, string> = {
  type: `"type=" followed by ${tagTypeTextUsage}`,
  name: '"name=<name>"',
  optional: '"optional=true" or "optional=false"',
  nullable: '"nullable=true" or "nullable=false"',
  description: 'description="<text>"',
  union: '"union={<key>: <schema>, ...}"',
}

const fieldKeys = Object.keys(optionUsages)

export const blockFieldKeys = fieldKeys.filter((key) => key !== 'name')

const unionPattern = /^\{([^{}]*)\}$/

const unionMemberPattern = /^([^\s:,]+)\s*:\s*([^\s:,]+)$/

export function taggedCommentsToSchemaTags(
  comments: Array<TaggedComment>,
  context: SchemaContext,
): ReadTagSchemas {
  const read: ReadTagSchemas = {
    schemas: new Set(),
    fields: new Map(),
    malformedFields: new Set(),
    errors: [],
    warnings: [],
  }
  const tagged: TaggedElements = { schemas: new Set(), fields: new Set() }
  for (const { element, tags } of comments) {
    if (tags.some(isHandlerTag) || isDeclaredByScript(element, context)) {
      continue
    }
    const schemaTag = tagsToSingle(tags, 'schema', read)
    if (schemaTag !== undefined) {
      schemaTagToName(schemaTag, element, context, read, tagged.schemas)
    }
    const fieldTag = tagsToSingle(tags, 'field', read)
    if (fieldTag !== undefined) {
      fieldTagToOptions(fieldTag, element, read, tagged.fields)
    }
  }
  return read
}

function isDeclaredByScript(element: ts.Node, context: SchemaContext): boolean {
  if (!element.getSourceFile().isDeclarationFile) {
    return false
  }
  let owner = element
  if (ts.isPropertySignature(element)) {
    owner = memberToOwner(element)
  }
  return isObjectDeclaration(owner) && isShadowedByScript(owner, context)
}

function tagsToSingle(
  tags: Array<CommentTag>,
  keyword: 'schema' | 'field',
  read: ReadTagSchemas,
): CommentTag | undefined {
  const [tag, ...extra] = tags.filter(
    (candidate) => candidate.keyword === keyword,
  )
  read.errors.push(
    ...extra.map(({ location }) => ({
      message: `"@bidirekt ${keyword}" is declared more than once in this comment: keep one`,
      location,
    })),
  )
  return tag
}

function schemaTagToName(
  tag: CommentTag,
  element: ts.Node,
  context: SchemaContext,
  read: ReadTagSchemas,
  taggedSchemas: Set<ts.Node | ts.Symbol>,
): void {
  if (ts.isJSDocTypedefTag(element) || ts.isJSDocCallbackTag(element)) {
    read.warnings.push({
      message: `"@bidirekt schema" is on a @${element.tagName.text}, so it is not read: declare the schema as a class with "@bidirekt schema"`,
      location: tag.location,
    })
    return
  }
  if (!ts.isEnumDeclaration(element) && !isObjectDeclaration(element)) {
    read.warnings.push({
      message:
        '"@bidirekt schema" is not above an enum, a class, an interface or an object type, so it is not read: put it above one of them',
      location: tag.location,
    })
    return
  }
  if (
    ts.isTypeAliasDeclaration(element) &&
    ts.isTypeLiteralNode(element.type) &&
    typeLiteralToMapValues(element.type, context) !== undefined
  ) {
    read.errors.push({
      message: `"@bidirekt schema" is above type "${element.name.text}", which is a map, not an object: remove the tag and use "${element.name.text}" as a field's type`,
      location: tag.location,
    })
    return
  }
  if (isObjectDeclaration(element)) {
    const tagged = declarationToTagged(element, context)
    if (taggedSchemas.has(tagged)) {
      read.errors.push({
        message: `"@bidirekt schema" is declared more than once on ${declarationToDescription(element)}: keep one`,
        location: tag.location,
      })
      return
    }
    taggedSchemas.add(tagged)
    read.schemas.add(element)
  }
  const declared = tagToName(tag)
  if (isDiagnostic(declared)) {
    read.errors.push(declared)
    return
  }
  if (ts.isEnumDeclaration(element)) {
    enumTagToSchema(tag, element, declared, context, read, taggedSchemas)
    return
  }
  const name = declared ?? element.name?.text
  if (name === undefined) {
    read.errors.push({
      message:
        'cannot name an anonymous class: declare it with "@bidirekt schema name=<name>"',
      location: tag.location,
    })
    return
  }
  context.schemaDeclarations.set(element, name)
}

function enumTagToSchema(
  tag: CommentTag,
  element: ts.EnumDeclaration,
  declared: string | undefined,
  context: SchemaContext,
  read: ReadTagSchemas,
  taggedSchemas: Set<ts.Node | ts.Symbol>,
): void {
  const symbol = context.checker.getSymbolAtLocation(element.name)
  if (symbol === undefined) {
    return
  }
  if (taggedSchemas.has(symbol)) {
    read.errors.push({
      message: `"@bidirekt schema" is declared more than once on enum "${symbol.name}": keep one`,
      location: tag.location,
    })
    return
  }
  taggedSchemas.add(symbol)
  const schema = enumToNamedSchema(symbol, declared ?? symbol.name, context)
  if (isDiagnostic(schema)) {
    read.errors.push({ ...schema, location: tag.location })
  } else if (schema === undefined) {
    read.warnings.push({
      message: `"@bidirekt schema" is above enum "${symbol.name}", which has no string members, so it is not read: make its members strings`,
      location: tag.location,
    })
  }
}

function declarationToTagged(
  declaration: SchemaDeclaration,
  context: SchemaContext,
): ts.Node | ts.Symbol {
  if (!ts.isInterfaceDeclaration(declaration)) {
    return declaration
  }
  return context.checker.getSymbolAtLocation(declaration.name) ?? declaration
}

function tagToName(tag: CommentTag): string | Diagnostic | undefined {
  const options = argumentsToOptions(tag.arguments, tag, ['name'])
  if (isDiagnostic(options)) {
    return options
  }
  return options.name
}

function fieldTagToOptions(
  tag: CommentTag,
  element: ts.Node,
  read: ReadTagSchemas,
  taggedFields: Set<ts.Node>,
): void {
  if (!ts.isPropertyDeclaration(element) && !ts.isPropertySignature(element)) {
    read.warnings.push({
      message:
        '"@bidirekt field" is not above a property, so it is not read: put it above a property of a class, an interface or an object type',
      location: tag.location,
    })
    return
  }
  if (isStatic(element)) {
    read.warnings.push({
      message:
        '"@bidirekt field" is above a static property, so it is not read: put it above a property',
      location: tag.location,
    })
    return
  }
  if (taggedFields.has(element)) {
    read.errors.push({
      message: `"@bidirekt field" is declared more than once on property "${element.name.getText()}": keep one`,
      location: tag.location,
    })
    return
  }
  taggedFields.add(element)
  const options = argumentsToOptions(tag.arguments, tag, fieldKeys)
  if (isDiagnostic(options)) {
    read.errors.push(options)
    read.malformedFields.add(element)
    return
  }
  read.fields.set(element, { options, location: tag.location })
}

export function argumentsToOptions(
  tagArguments: Array<string>,
  tag: CommentTag,
  keys: Array<string>,
): FieldOptions | Diagnostic {
  if (tag.error !== undefined) {
    return tag.error
  }
  const options: FieldOptions = {}
  const seen = new Set<string>()
  for (const argument of tagArguments) {
    const option = argumentToOption(argument)
    const key = option?.key ?? ''
    const fail = (usage: string): Diagnostic => ({
      message: `cannot read "${argument}" in "@bidirekt ${tag.keyword}": write ${usage}`,
      location: tag.location,
    })
    if (option === undefined || !keys.includes(key)) {
      return fail(keysToUsage(keys))
    }
    if (seen.has(key)) {
      return {
        message: `"${key}=" is declared more than once in "@bidirekt ${tag.keyword}": keep one`,
        location: tag.location,
      }
    }
    seen.add(key)
    const value = option.value
    const usage = fail(optionUsages[key])
    switch (key) {
      case 'type': {
        const declared = tagTypeTextToSchemaNode(value)
        if (declared === undefined) {
          return usage
        }
        options.declared = declared
        break
      }
      case 'union': {
        const members = valueToUnionMembers(value)
        if (members === undefined) {
          return usage
        }
        options.declared = { type: 'union', members }
        break
      }
      case 'optional':
      case 'nullable': {
        if (value !== 'true' && value !== 'false') {
          return usage
        }
        options[key] = value === 'true'
        break
      }
      case 'name':
      case 'description': {
        if (value === '') {
          return usage
        }
        options[key] = value
        break
      }
    }
  }
  if (seen.has('type') && seen.has('union')) {
    return {
      message:
        'declare either "type=" or "union=" in "@bidirekt field", not both',
      location: tag.location,
    }
  }
  return options
}

function keysToUsage(keys: Array<string>): string {
  if (keys.length === 1) {
    return optionUsages[keys[0]]
  }
  return `"<key>=<value>" with key ${namesToChoice(keys)}`
}

function valueToUnionMembers(value: string): Array<UnionMember> | undefined {
  const braces = unionPattern.exec(value)
  if (braces === null) {
    return undefined
  }
  const members: Array<UnionMember> = []
  for (const member of braces[1].split(',')) {
    const match = unionMemberPattern.exec(member.trim())
    if (
      match === null ||
      !isSchemaName(match[2]) ||
      members.some(({ key }) => key === match[1])
    ) {
      return undefined
    }
    const [, key, schema] = match
    members.push({ key, node: { type: 'ref', schema } })
  }
  return members
}
