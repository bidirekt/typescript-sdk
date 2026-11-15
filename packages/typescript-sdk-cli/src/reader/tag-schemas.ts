import ts from 'typescript'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { argumentToOption } from './comment-tags.ts'
import type { CommentTag, TaggedComment } from './comment-tags.ts'
import type { SchemaContext } from './schema-context.ts'
import { enumToNamedSchema } from './type-to-schema-node.ts'

export type ReadTagSchemas = {
  errors: Array<Diagnostic>
  warnings: Array<Diagnostic>
}

export function taggedCommentsToEnumSchemas(
  comments: Array<TaggedComment>,
  context: SchemaContext,
): ReadTagSchemas {
  const read: ReadTagSchemas = { errors: [], warnings: [] }
  const tagged = new Set<ts.Symbol>()
  for (const { element, tags } of comments) {
    const schemaTags = tags.filter(({ keyword }) => keyword === 'schema')
    if (schemaTags.length === 0) {
      continue
    }
    const [tag, ...extra] = schemaTags
    if (!ts.isEnumDeclaration(element)) {
      read.warnings.push({
        message:
          '"@bidirekt schema" is not above an enum, so it is not read: put it above an enum',
        location: tag.location,
      })
      continue
    }
    read.errors.push(
      ...extra.map(({ location }) => ({
        message:
          '"@bidirekt schema" is declared more than once in this comment: keep one',
        location,
      })),
    )
    const symbol = context.checker.getSymbolAtLocation(element.name)
    if (symbol === undefined) {
      continue
    }
    if (tagged.has(symbol)) {
      read.errors.push({
        message: `"@bidirekt schema" is declared more than once on enum "${symbol.name}": keep one`,
        location: tag.location,
      })
      continue
    }
    tagged.add(symbol)
    const name = tagToName(tag)
    if (isDiagnostic(name)) {
      read.errors.push(name)
      continue
    }
    const schema = enumToNamedSchema(symbol, name ?? symbol.name, context)
    if (isDiagnostic(schema)) {
      read.errors.push({ ...schema, location: tag.location })
    } else if (schema === undefined) {
      read.warnings.push({
        message: `"@bidirekt schema" is above enum "${symbol.name}", which has no string members, so it is not read: make its members strings`,
        location: tag.location,
      })
    }
  }
  return read
}

function tagToName(tag: CommentTag): string | Diagnostic | undefined {
  let name: string | undefined
  for (const argument of tag.arguments) {
    const option = argumentToOption(argument)
    if (
      option === undefined ||
      option.key !== 'name' ||
      option.value === '' ||
      option.value.includes('"')
    ) {
      return {
        message: `cannot read "${argument}" in "@bidirekt schema": write "name=<name>"`,
        location: tag.location,
      }
    }
    if (name !== undefined) {
      return {
        message: `"name" is declared more than once in "@bidirekt schema": keep one`,
        location: tag.location,
      }
    }
    name = option.value
  }
  return name
}
