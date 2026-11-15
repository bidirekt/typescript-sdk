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

export function typeTextToSchemaNode(text: string): SchemaNode | undefined {
  if (text.endsWith('[]')) {
    const items = typeTextToSchemaNode(text.slice(0, -'[]'.length))
    if (items === undefined) {
      return undefined
    }
    return { type: 'array', items }
  }
  if (text.startsWith('map<') && text.endsWith('>')) {
    const values = typeTextToSchemaNode(text.slice('map<'.length, -'>'.length))
    if (values === undefined) {
      return undefined
    }
    return { type: 'map', values }
  }
  const primitive = primitiveTypes.find((type) => type === text)
  if (primitive === undefined) {
    return undefined
  }
  return { type: primitive }
}
