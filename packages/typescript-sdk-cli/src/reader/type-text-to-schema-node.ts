import type { PrimitiveType, SchemaNode } from '../model/contract.ts'
import { namesToChoice } from './literal-options.ts'

const primitiveTypes: Array<PrimitiveType> = [
  'string',
  'integer',
  'float',
  'number',
  'boolean',
]

export const typeTextUsage = namesToChoice([
  ...primitiveTypes,
  '<type>[]',
  'map<type>',
])

export const tagTypeTextUsage = `${primitiveTypes.join(', ')}, a schema name, <type>[] or map<type>`

const schemaNamePattern = /^[^\s<>[\],:=]+$/

type LeafToSchemaNode = (leaf: string) => SchemaNode | undefined

export function typeTextToSchemaNode(text: string): SchemaNode | undefined {
  return nestedTextToSchemaNode(text, primitiveToSchemaNode)
}

export function tagTypeTextToSchemaNode(text: string): SchemaNode | undefined {
  return nestedTextToSchemaNode(
    text,
    (leaf) => primitiveToSchemaNode(leaf) ?? schemaNameToSchemaNode(leaf),
  )
}

function nestedTextToSchemaNode(
  text: string,
  leafToSchemaNode: LeafToSchemaNode,
): SchemaNode | undefined {
  if (text.endsWith('[]')) {
    const items = nestedTextToSchemaNode(
      text.slice(0, -'[]'.length),
      leafToSchemaNode,
    )
    if (items === undefined) {
      return undefined
    }
    return { type: 'array', items }
  }
  if (text.startsWith('map<') && text.endsWith('>')) {
    const values = nestedTextToSchemaNode(
      text.slice('map<'.length, -'>'.length),
      leafToSchemaNode,
    )
    if (values === undefined) {
      return undefined
    }
    return { type: 'map', values }
  }
  return leafToSchemaNode(text)
}

function primitiveToSchemaNode(text: string): SchemaNode | undefined {
  const primitive = primitiveTypes.find((type) => type === text)
  if (primitive === undefined) {
    return undefined
  }
  return { type: primitive }
}

export function isSchemaName(text: string): boolean {
  return schemaNamePattern.test(text)
}

function schemaNameToSchemaNode(text: string): SchemaNode | undefined {
  if (!isSchemaName(text)) {
    return undefined
  }
  return { type: 'ref', schema: text }
}
