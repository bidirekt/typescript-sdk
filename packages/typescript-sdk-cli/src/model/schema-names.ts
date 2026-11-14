import type { NamedSchema, SourceLocation } from './contract.ts'

export function schemaToListName(schema: string): string {
  return `${schema}List`
}

export function listToNamedSchema(
  schema: string,
  name: string | undefined,
  location: SourceLocation,
): NamedSchema {
  return {
    name: name ?? schemaToListName(schema),
    node: { type: 'array', items: { type: 'ref', schema } },
    location,
  }
}
