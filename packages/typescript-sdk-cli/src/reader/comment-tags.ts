import ts from 'typescript'
import type { SourceLocation } from '../model/contract.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import type { ProtocolModule } from '../protocols.ts'
import { namesToChoice } from './literal-options.ts'
import { nodeToLocation } from './location.ts'
import { programToUserFiles } from './program.ts'
import type { ProjectProgram } from './program.ts'
import { isObjectDeclaration, memberToOwner } from './schema-context.ts'
import { protocolsToDecoratorTargets } from './sdk-references.ts'

export type CommentTag = {
  keyword: string
  protocol?: string
  vocabulary?: string
  arguments: Array<string>
  location: SourceLocation
  error?: Diagnostic
}

export type HandlerTag = CommentTag & { protocol: string }

export type TaggedComment = {
  element: ts.Node
  tags: Array<CommentTag>
  hasUnknownTag?: boolean
}

export type TagOption = {
  key: string
  value: string
}

export type ReadComments = {
  comments: Array<TaggedComment>
  errors: Array<Diagnostic>
  warnings: Array<Diagnostic>
}

const tagName = 'bidirekt'

const taggedCommentPattern = /\/\*\*(?:(?!\*\/)[\s\S])*?@bidirekt/i

const mentionPattern = /(?<![^\s*])(@bidirekt[^\s*]*)[ \t]*([^\s*]*)/gi

const argumentPattern = /description="[^"]*"(?=\s|$)|union=\{[^}]*\}\S*|\S+/g

const quotedValuePattern = /^"[^"]*"$/

const quotedDescriptionPattern = /^description="[^"]*"$/

const coreKeywords = ['schema', 'field']

const vocabularyKeyword = 'field'

type TagWords = {
  keywords: ReadonlyArray<string>
  keywordChoice: string
  owners: ReadonlyMap<string, string>
  renamed: ReadonlyMap<string, string>
  vocabularies: ReadonlySet<string>
  decorators: ReadonlySet<string>
}

type Span = {
  start: number
  end: number
}

type Mention = {
  position: number
  written: string
  next: string
}

export function programToTaggedComments(
  projectProgram: ProjectProgram,
  protocols: ReadonlyArray<ProtocolModule>,
): ReadComments {
  projectProgram.program.getTypeChecker()
  const words = protocolsToTagWords(protocols)
  const read: ReadComments = { comments: [], errors: [], warnings: [] }
  for (const file of programToUserFiles(projectProgram)) {
    if (!taggedCommentPattern.test(file.text)) {
      continue
    }
    const fileRead = fileToTaggedComments(file, words)
    if (file.isDeclarationFile) {
      read.comments.push(...fileRead.comments.flatMap(typeDeclarationComment))
      continue
    }
    read.comments.push(...fileRead.comments)
    read.errors.push(...fileRead.errors)
    read.warnings.push(...fileRead.warnings)
  }
  return read
}

function protocolsToTagWords(
  protocols: ReadonlyArray<ProtocolModule>,
): TagWords {
  const owned = protocols.flatMap(({ name, tagKeywords }) =>
    [name, ...tagKeywords].map((keyword): [string, string] => [keyword, name]),
  )
  const keywords = [...owned.map(([keyword]) => keyword), ...coreKeywords]
  return {
    keywords,
    keywordChoice: namesToChoice(keywords),
    owners: new Map(owned),
    renamed: new Map(
      protocols.flatMap(({ renamedTags }) => Object.entries(renamedTags ?? {})),
    ),
    vocabularies: new Set(
      protocols
        .filter(({ vocabulary }) => vocabulary !== undefined)
        .map(({ name }) => name),
    ),
    decorators: new Set(protocolsToDecoratorTargets(protocols).keys()),
  }
}

function fileToTaggedComments(
  file: ts.SourceFile,
  words: TagWords,
): ReadComments {
  const read: ReadComments = { comments: [], errors: [], warnings: [] }
  const attached = new Set<number>()
  const comments = new Map<number, ts.CommentRange>()
  const jsxTexts: Array<Span> = []
  const pending: Array<ts.Node> = [file]
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.kind === ts.SyntaxKind.EndOfFileToken) {
      continue
    }
    if (ts.isJsxText(node)) {
      jsxTexts.push({ start: node.pos, end: node.end })
      continue
    }
    const children = node.getChildren(file)
    for (const child of children) {
      if (ts.isJSDoc(child)) {
        if (!attached.has(child.pos)) {
          attached.add(child.pos)
          readComment(child, node, read, words)
        }
        continue
      }
      for (const range of [
        ...(ts.getLeadingCommentRanges(file.text, child.pos) ?? []),
        ...(ts.getTrailingCommentRanges(file.text, child.end) ?? []),
      ]) {
        comments.set(range.pos, range)
      }
    }
    for (let index = children.length - 1; index >= 0; index--) {
      if (!ts.isJSDoc(children[index])) {
        pending.push(children[index])
      }
    }
  }
  for (const range of comments.values()) {
    if (!attached.has(range.pos) && !isInside(jsxTexts, range.pos)) {
      warnUnreadComment(file, range, read, words)
    }
  }
  return read
}

function typeDeclarationComment({
  element,
  tags,
}: TaggedComment): Array<TaggedComment> {
  const schemaTags = tags.filter(
    (tag) => tag.keyword === 'schema' || tag.keyword === 'field',
  )
  if (schemaTags.length === 0 || !isTypeDeclarationPart(element)) {
    return []
  }
  return [{ element, tags: schemaTags }]
}

function isTypeDeclarationPart(element: ts.Node): boolean {
  let owner = element
  if (ts.isPropertySignature(element)) {
    owner = memberToOwner(element)
  }
  return isObjectDeclaration(owner) && !ts.isClassDeclaration(owner)
}

export function isHandlerTag(tag: CommentTag): tag is HandlerTag {
  return tag.protocol !== undefined && tag.keyword === tag.protocol
}

export function tagToText(tag: CommentTag): string {
  return [tagToLabel(tag), ...tag.arguments].join(' ')
}

export function tagToLabel(tag: CommentTag): string {
  if (tag.vocabulary === undefined) {
    return `@${tagName} ${tag.keyword}`
  }
  return `@${tagName} ${tag.vocabulary} ${tag.keyword}`
}

export function argumentToOption(argument: string): TagOption | undefined {
  const separator = argument.indexOf('=')
  if (separator <= 0) {
    return undefined
  }
  const key = argument.slice(0, separator)
  const value = argument.slice(separator + 1)
  if (key === 'description' && quotedValuePattern.test(value)) {
    return { key, value: value.slice(1, -1) }
  }
  return { key, value }
}

function readComment(
  comment: ts.JSDoc,
  element: ts.Node,
  read: ReadComments,
  words: TagWords,
): void {
  const file = comment.getSourceFile()
  const fences = commentToFences(file, comment)
  const examples: Array<Span> = []
  const tags: Array<CommentTag> = []
  let hasUnknownTag = false
  let exampleStart: number | undefined
  for (const tag of comment.tags ?? []) {
    if (isInside(fences, tag.pos) || !startsItsLine(file, comment, tag.pos)) {
      continue
    }
    const name = tag.tagName.text
    const isOurs = name.toLowerCase().startsWith(tagName)
    if (exampleStart !== undefined) {
      if (isOurs || !isFollowedBySpace(tag)) {
        continue
      }
      examples.push({ start: exampleStart, end: tag.pos })
      exampleStart = undefined
    }
    if (!isOurs) {
      if (name === 'example' && tagToComment(tag).trim() === '') {
        exampleStart = tag.tagName.end
      }
      continue
    }
    const written = tagToWritten(tag)
    if (namesPackageOrDecorator(written, words)) {
      continue
    }
    if (name !== tagName || !isFollowedBySpace(tag)) {
      read.warnings.push({
        message: `"${written}" is not a @${tagName} tag: write "@${tagName} <keyword>"`,
        location: nodeToLocation(tag),
      })
      continue
    }
    const location = nodeToLocation(tag)
    const tagArguments = textToArguments(tagToComment(tag))
    const [keyword, ...remaining] = tagArguments
    const [vocabularyField, ...fieldArguments] = remaining
    if (
      words.vocabularies.has(keyword) &&
      vocabularyField === vocabularyKeyword
    ) {
      tags.push(
        argumentsToTag(
          vocabularyKeyword,
          { vocabulary: keyword },
          fieldArguments,
          location,
        ),
      )
    } else if (words.keywords.includes(keyword)) {
      tags.push(
        argumentsToTag(
          keyword,
          keywordToOwner(keyword, words),
          remaining,
          location,
        ),
      )
    } else if (tagArguments.length === 0) {
      hasUnknownTag = true
      read.errors.push({
        message: `"@${tagName}" needs a keyword: use ${words.keywordChoice}`,
        location,
      })
    } else {
      hasUnknownTag = true
      read.errors.push({
        message: unknownKeywordToMessage(keyword, words),
        location,
      })
    }
  }
  if (exampleStart !== undefined) {
    examples.push({ start: exampleStart, end: comment.end })
  }
  warnSkippedTags(file, comment, fences, examples, read, words)
  if (tags.length > 0) {
    const typedef = comment.tags?.find(
      (tag) => ts.isJSDocTypedefTag(tag) || ts.isJSDocCallbackTag(tag),
    )
    let target = element
    if (
      typedef !== undefined &&
      !tags.some(isHandlerTag) &&
      !isOwnComment(comment, element)
    ) {
      target = typedef
    }
    read.comments.push({ element: target, tags, hasUnknownTag })
  }
}

function unknownKeywordToMessage(keyword: string, words: TagWords): string {
  const renamed = words.renamed.get(keyword)
  if (renamed === undefined) {
    return `unknown tag "@${tagName} ${keyword}": use ${words.keywordChoice}`
  }
  return `unknown tag "@${tagName} ${keyword}": write "@${tagName} ${renamed}"`
}

function warnSkippedTags(
  file: ts.SourceFile,
  comment: ts.TextRange,
  fences: Array<Span>,
  examples: Array<Span>,
  read: ReadComments,
  words: TagWords,
): void {
  for (const mention of commentToMentions(file, comment)) {
    if (
      mention.written !== `@${tagName}` ||
      isInside(fences, mention.position)
    ) {
      continue
    }
    const atLineStart = startsItsLine(file, comment, mention.position)
    const isKeyword = words.keywords.includes(mention.next)
    const shown = [mention.written, mention.next].join(' ').trim()
    const { line } = file.getLineAndCharacterOfPosition(mention.position)
    const location = { file: file.fileName, line: line + 1 }
    if (isInside(examples, mention.position)) {
      if (atLineStart || isKeyword) {
        read.warnings.push({
          message: `"${shown}" is inside an @example, so it is not read: move it above the @example`,
          location,
        })
      }
      continue
    }
    if (!atLineStart && isKeyword) {
      read.warnings.push({
        message: `"${shown}" is not at the start of a comment line, so it is not read: start the line with it`,
        location,
      })
    }
  }
}

function commentToMentions(
  file: ts.SourceFile,
  comment: ts.TextRange,
): Array<Mention> {
  const text = file.text.slice(comment.pos, comment.end)
  return [...text.matchAll(mentionPattern)].map((match) => ({
    position: comment.pos + match.index,
    written: match[1],
    next: match[2],
  }))
}

function commentToFences(
  file: ts.SourceFile,
  comment: ts.TextRange,
): Array<Span> {
  const text = file.text.slice(comment.pos, comment.end)
  const marks = [...text.matchAll(/```/g)].map(
    (match) => comment.pos + match.index,
  )
  const fences: Array<Span> = []
  for (let index = 0; index < marks.length; index += 2) {
    fences.push({ start: marks[index], end: marks[index + 1] ?? comment.end })
  }
  return fences
}

function isInside(spans: Array<Span>, position: number): boolean {
  return spans.some(({ start, end }) => start <= position && position < end)
}

function startsItsLine(
  file: ts.SourceFile,
  comment: ts.TextRange,
  position: number,
): boolean {
  const lineStart = Math.max(
    file.text.lastIndexOf('\n', position - 1) + 1,
    comment.pos,
  )
  return /^\s*(\/\*\*)?\s*\**\s*$/.test(file.text.slice(lineStart, position))
}

function keywordToOwner(
  keyword: string,
  words: TagWords,
): Pick<CommentTag, 'protocol'> {
  const protocol = words.owners.get(keyword)
  if (protocol === undefined) {
    return {}
  }
  return { protocol }
}

function argumentsToTag(
  keyword: string,
  owner: Pick<CommentTag, 'protocol' | 'vocabulary'>,
  tagArguments: Array<string>,
  location: SourceLocation,
): CommentTag {
  const tag: CommentTag = {
    keyword,
    ...owner,
    arguments: tagArguments,
    location,
  }
  if (
    tagArguments.some(
      (argument) =>
        argument.includes('"') && !quotedDescriptionPattern.test(argument),
    )
  ) {
    tag.error = {
      message: `cannot read "${tagToText(tag)}": remove the quotes, only description="<text>" takes them`,
      location,
    }
  }
  return tag
}

function isOwnComment(comment: ts.JSDoc, element: ts.Node): boolean {
  return (
    (isObjectDeclaration(element) ||
      ts.isEnumDeclaration(element) ||
      ts.isPropertyDeclaration(element) ||
      ts.isPropertySignature(element)) &&
    element.getChildren().filter(ts.isJSDoc).at(-1) === comment
  )
}

function isFollowedBySpace(tag: ts.JSDocTag): boolean {
  const next = tag.getSourceFile().text.charAt(tag.tagName.end)
  return next === '' || /[\s*]/.test(next)
}

function namesPackageOrDecorator(written: string, words: TagWords): boolean {
  const [name] = written.slice(1).split(/[^\w$]/)
  return written.startsWith(`@${tagName}/`) || words.decorators.has(name)
}

function tagToWritten(tag: ts.JSDocTag): string {
  const [written] = /^@[^\s*]+/.exec(
    tag.getSourceFile().text.slice(tag.pos),
  ) ?? [`@${tag.tagName.text}`]
  return written
}

function tagToComment(tag: ts.JSDocTag): string {
  return ts.getTextOfJSDocComment(tag.comment) ?? ''
}

function textToArguments(text: string): Array<string> {
  const [beforeFence] = text.split('```')
  return (
    beforeFence
      .replace(/\r\n?/g, '\n')
      .replaceAll('*\\/', '*/')
      .match(argumentPattern) ?? []
  )
}

function warnUnreadComment(
  file: ts.SourceFile,
  range: ts.CommentRange,
  read: ReadComments,
  words: TagWords,
): void {
  if (!file.text.startsWith('/**', range.pos)) {
    return
  }
  const fences = commentToFences(file, range)
  const tag = commentToMentions(file, range).find(
    ({ position, written }) =>
      startsItsLine(file, range, position) &&
      !isInside(fences, position) &&
      !namesPackageOrDecorator(written, words),
  )
  if (tag === undefined) {
    return
  }
  const { line } = file.getLineAndCharacterOfPosition(tag.position)
  read.warnings.push({
    message:
      'this comment is not above a statement or declaration, so its "@bidirekt" tags are not read: move it above the statement or declaration, before its decorators',
    location: { file: file.fileName, line: line + 1 },
  })
}
