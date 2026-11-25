import type ts from 'typescript'
import type {
  NamedSchema,
  Property,
  SourceLocation,
} from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import type { ProtocolModule } from '../protocols.ts'
import { isHandlerTag, tagToText } from './comment-tags.ts'
import type { CommentTag, TaggedComment } from './comment-tags.ts'
import { namesToChoice } from './literal-options.ts'
import { fieldOptionsToProperty } from './schema-classes.ts'
import type { SdkDecorator } from './sdk-references.ts'
import {
  argumentsToOptions,
  blockFieldKeys,
  tagToVocabulary,
} from './tag-schemas.ts'

export type HandlerComments = {
  comments: Map<string, Array<TaggedComment>>
  schemas: Array<NamedSchema>
  errors: Array<Diagnostic>
}

type BlockFields = {
  properties: Array<Property>
  hasUnreadField: boolean
}

type BlockSchema = {
  name: string
  location: SourceLocation
  fields: BlockFields
}

export function taggedCommentsToHandlerComments(
  comments: Array<TaggedComment>,
  decorators: Array<SdkDecorator>,
  protocols: ReadonlyArray<ProtocolModule>,
): HandlerComments {
  const read: HandlerComments = {
    comments: new Map(),
    schemas: [],
    errors: [],
  }
  const decorated = Map.groupBy(
    decorators,
    (reference): ts.Node => reference.decorator.parent,
  )
  const handled = new Set<ts.Node>()
  for (const { element, tags } of comments) {
    const handlers = tags.filter(isHandlerTag)
    const protocolTags = tags.filter(
      (tag) => tag.protocol !== undefined && !isHandlerTag(tag),
    )
    if (handlers.length === 0) {
      tagsToProtocolComments(element, protocolTags, read)
      continue
    }
    const [handler, ...extra] = handlers
    if (handled.has(element)) {
      const handlerTags = protocols.map(({ name }) => `"@bidirekt ${name}"`)
      read.errors.push({
        message: `a handler is declared more than once on this element: keep one ${namesToChoice(handlerTags)} comment`,
        location: handler.location,
      })
      continue
    }
    handled.add(element)
    read.errors.push(
      ...extra.map((tag) => ({
        message: `a comment declares one handler: move "${tagToText(tag)}" to its own comment`,
        location: tag.location,
      })),
    )
    const onElement = decorated.get(element) ?? []
    if (onElement.length > 0) {
      read.errors.push(
        ...onElement.flatMap(({ name, location }) => {
          const message = `@${name} and "${tagToText(handler)}" are both on this handler: keep one`
          return [
            { message, location },
            { message, location: handler.location },
          ]
        }),
      )
      continue
    }
    tagsToProtocolComments(element, [handler, ...protocolTags], read)
    read.schemas.push(...tagsToBlockSchemas(tags, read.errors, protocols))
  }
  return read
}

function tagsToProtocolComments(
  element: ts.Node,
  tags: Array<CommentTag>,
  read: HandlerComments,
): void {
  for (const [protocol, own] of Map.groupBy(tags, (tag) => tag.protocol)) {
    if (protocol === undefined) {
      continue
    }
    const comments = read.comments.get(protocol) ?? []
    comments.push({ element, tags: own })
    read.comments.set(protocol, comments)
  }
}

function tagsToBlockSchemas(
  tags: Array<CommentTag>,
  errors: Array<Diagnostic>,
  protocols: ReadonlyArray<ProtocolModule>,
): Array<NamedSchema> {
  const blocks: Array<BlockSchema> = []
  let fields: BlockFields | undefined
  for (const tag of tags) {
    if (tag.keyword === 'schema') {
      fields = { properties: [], hasUnreadField: false }
      const name = tagToBlockSchemaName(tag)
      if (isDiagnostic(name)) {
        errors.push(name)
        continue
      }
      blocks.push({ name, location: tag.location, fields })
      continue
    }
    if (tag.keyword !== 'field') {
      continue
    }
    if (fields === undefined) {
      errors.push({
        message:
          '"@bidirekt field" in a handler\'s comment needs a "@bidirekt schema <name>" above it',
        location: tag.location,
      })
      continue
    }
    const property = tagToBlockProperty(tag, protocols)
    if (isDiagnostic(property)) {
      errors.push(property)
      fields.hasUnreadField = true
      continue
    }
    fields.properties.push(property)
  }
  for (const { name, location, fields: read } of blocks) {
    if (read.properties.length === 0 && !read.hasUnreadField) {
      errors.push({
        message: `schema "${name}" has no field: annotate at least one field with "@bidirekt field"`,
        location,
      })
    }
  }
  return blocks.map(({ name, location, fields: read }) => ({
    name,
    node: { type: 'object', properties: read.properties },
    location,
  }))
}

function tagToBlockSchemaName(tag: CommentTag): string | Diagnostic {
  const [name] = tag.arguments
  if (tag.error !== undefined) {
    return tag.error
  }
  if (tag.arguments.length !== 1 || name.includes('=')) {
    return {
      message: `cannot read "${tagToText(tag)}" in a handler's comment: write "@bidirekt schema <name>"`,
      location: tag.location,
    }
  }
  return name
}

function tagToBlockProperty(
  tag: CommentTag,
  protocols: ReadonlyArray<ProtocolModule>,
): Property | Diagnostic {
  const [name, ...remaining] = tag.arguments
  if (tag.error !== undefined) {
    return tag.error
  }
  if (tag.arguments.length === 0 || name.includes('=')) {
    return {
      message: `cannot read "${tagToText(tag)}" in a handler's comment: write "@bidirekt field <name> type=<type>"`,
      location: tag.location,
    }
  }
  const options = argumentsToOptions(
    remaining,
    tag,
    blockFieldKeys,
    tagToVocabulary(tag, protocols),
  )
  if (isDiagnostic(options)) {
    return options
  }
  if (options.declared === undefined) {
    return {
      message: `field "${name}" in a handler's comment needs its type: declare it with "type=<type>"`,
      location: tag.location,
    }
  }
  return fieldOptionsToProperty(name, options.declared, options, tag.location)
}
