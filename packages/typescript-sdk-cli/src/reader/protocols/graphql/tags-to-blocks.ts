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
import { isHandlerTag, tagToText } from '../../comment-tags.ts'
import type {
  CommentTag,
  HandlerTag,
  TaggedComment,
} from '../../comment-tags.ts'
import {
  isSchemaName,
  textToPrimitive,
} from '../../type-text-to-schema-node.ts'

const consumesUsage =
  '@bidirekt graphql consumes <provider> query|mutation <name>'

const operationKinds: Array<OperationKind> = ['query', 'mutation']

const returnsPattern =
  /^([^\s?[\]]+)(\?)?(?:(\[\])(\?)?)?(?: as ([^\s?[\]]+))?$/

const returnsUsage =
  '"<type>", "<type>?", "<type>[]", "<type>[]?", "<type>?[]" or "<type>?[]?", each with an optional "as <name>", where <type> is a schema, a primitive, scalar:<name> or enum:<A>|<B>'

export function taggedCommentsToBlocks(
  comments: Array<TaggedComment>,
): ProtocolRead<GraphqlBlock> {
  const read: ProtocolRead<GraphqlBlock> = {
    blocks: [],
    derived: [],
    errors: [],
  }
  for (const { tags } of comments) {
    for (const tag of tags.filter(({ keyword }) => keyword === 'graph')) {
      graphTagToRead(tag, read)
    }
    const handler = tags.find(isHandlerTag)
    const uses = tags.filter(
      ({ keyword }) => keyword === 'arguments' || keyword === 'returns',
    )
    if (handler === undefined) {
      read.errors.push(
        ...uses.map((tag) => ({
          message: `"@bidirekt ${tag.keyword}" needs a "@bidirekt graphql consumes" tag in the same comment`,
          location: tag.location,
        })),
      )
      continue
    }
    tagsToOperation(handler, uses, read)
  }
  return read
}

function graphTagToRead(
  tag: CommentTag,
  read: ProtocolRead<GraphqlBlock>,
): void {
  if (tag.error !== undefined) {
    read.errors.push(tag.error)
    return
  }
  const [name] = tag.arguments
  if (tag.arguments.length !== 1) {
    read.errors.push({
      message: `cannot read "${tagToText(tag)}": write "@bidirekt graph <name>"`,
      location: tag.location,
    })
    return
  }
  read.blocks.push({
    block: { operations: [], graph: { name, location: tag.location } },
  })
}

function tagsToOperation(
  handler: HandlerTag,
  uses: Array<CommentTag>,
  read: ProtocolRead<GraphqlBlock>,
): void {
  const errors: Array<Diagnostic> = []
  const consumed = handlerToConsumed(handler)
  if (isDiagnostic(consumed)) {
    errors.push(consumed)
  }
  let argumentsUse: SchemaUse | undefined
  let returnsTag: CommentTag | undefined
  for (const tag of uses) {
    if (tag.error !== undefined) {
      errors.push(tag.error)
      continue
    }
    if (uses.slice(0, uses.indexOf(tag)).some(isSameKeyword(tag))) {
      errors.push({
        message: `"@bidirekt ${tag.keyword}" is declared more than once in this comment: keep one`,
        location: tag.location,
      })
      continue
    }
    if (tag.keyword === 'returns') {
      returnsTag = tag
      continue
    }
    const use = tagToArguments(tag)
    if (isDiagnostic(use)) {
      errors.push(use)
      continue
    }
    argumentsUse = use
  }
  let returns: Returns | Diagnostic = {
    message: `"${tagToText(handler)}" needs a "@bidirekt returns <type>" tag in the same comment`,
    location: handler.location,
  }
  if (returnsTag !== undefined) {
    returns = tagToReturns(returnsTag)
  }
  if (isDiagnostic(returns)) {
    errors.push(returns)
  }
  read.errors.push(...errors)
  if (
    isDiagnostic(consumed) ||
    isDiagnostic(returns) ||
    returnsTag === undefined ||
    errors.length > 0
  ) {
    return
  }
  const { schema, derived } = returnsToSchema(returns, returnsTag.location)
  if (derived !== undefined) {
    read.derived.push(derived)
  }
  const operation: Operation = {
    kind: consumed.kind,
    name: consumed.name,
    returns: { schema, location: returnsTag.location },
    location: handler.location,
  }
  if (argumentsUse !== undefined) {
    operation.arguments = argumentsUse
  }
  read.blocks.push({
    provider: consumed.provider,
    block: { operations: [operation] },
  })
}

function isSameKeyword(tag: CommentTag): (other: CommentTag) => boolean {
  return (other) => other.keyword === tag.keyword
}

function handlerToConsumed(
  handler: HandlerTag,
): { provider: string; kind: OperationKind; name: string } | Diagnostic {
  if (handler.error !== undefined) {
    return handler.error
  }
  const [form, provider, kind, name] = handler.arguments
  const operationKind = operationKinds.find((known) => known === kind)
  if (
    form !== 'consumes' ||
    handler.arguments.length !== 4 ||
    operationKind === undefined
  ) {
    return {
      message: `cannot read "${tagToText(handler)}": write "${consumesUsage}"`,
      location: handler.location,
    }
  }
  return { provider, kind: operationKind, name }
}

function tagToArguments(tag: CommentTag): SchemaUse | Diagnostic {
  const [schema] = tag.arguments
  if (tag.arguments.length !== 1 || !isSchemaName(schema)) {
    return {
      message: `cannot read "${tagToText(tag)}": write "@bidirekt arguments <schema>"`,
      location: tag.location,
    }
  }
  return { schema, location: tag.location }
}

function tagToReturns(tag: CommentTag): Returns | Diagnostic {
  const text = tag.arguments.join(' ')
  if (text === '') {
    return {
      message: `cannot read "${tagToText(tag)}": write "@bidirekt returns <type>"`,
      location: tag.location,
    }
  }
  const match = returnsPattern.exec(text)
  if (match === null) {
    return unreadableReturns(text, tag.location)
  }
  const [, written, typeMark, listMark, listMarkAfter] = match
  const typeNullable = typeMark === '?'
  const isList = listMark === '[]'
  const name = / as (\S+)$/.exec(text)?.[1]
  const type = textToReturnedType(written, name, text, tag.location)
  if (isDiagnostic(type)) {
    return type
  }
  if (
    type.kind === 'schema' &&
    name !== undefined &&
    !isList &&
    !typeNullable
  ) {
    return {
      message: `cannot read "${text}" as returns: a schema is returned by its own name, write "${written}"`,
      location: tag.location,
    }
  }
  let returns: Returns = { form: 'type', type }
  if (isList) {
    returns = {
      form: 'list',
      type,
      nullable: listMarkAfter === '?',
      nullableItems: typeNullable,
    }
  } else if (typeNullable) {
    returns = { form: 'nullable', type }
  }
  if (name !== undefined) {
    returns.name = name
  }
  return returns
}

function textToReturnedType(
  written: string,
  name: string | undefined,
  text: string,
  location: SourceLocation,
): ReturnedType | Diagnostic {
  const primitive = textToPrimitive(written)
  if (primitive !== undefined) {
    return { kind: 'primitive', type: primitive }
  }
  if (written.startsWith('scalar:')) {
    const scalar = written.slice('scalar:'.length)
    if (!isSchemaName(scalar)) {
      return unreadableReturns(text, location)
    }
    return { kind: 'scalar', scalar }
  }
  if (written.startsWith('enum:')) {
    const members = written.slice('enum:'.length).split('|')
    if (members.some((member) => member === '')) {
      return unreadableReturns(text, location)
    }
    if (name === undefined) {
      return {
        message: `cannot read "${text}" as returns: an enum needs a name, write "${text} as <name>"`,
        location,
      }
    }
    return { kind: 'enum', members, name }
  }
  if (!isSchemaName(written)) {
    return unreadableReturns(text, location)
  }
  return { kind: 'schema', schema: written }
}

function unreadableReturns(text: string, location: SourceLocation): Diagnostic {
  return {
    message: `cannot read "${text}" as returns: write ${returnsUsage}`,
    location,
  }
}
