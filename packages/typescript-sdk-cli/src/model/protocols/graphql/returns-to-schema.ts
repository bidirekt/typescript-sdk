import type { NamedSchema, SchemaNode, SourceLocation } from '../../contract.ts'
import type { ReturnedType, Returns } from './contract.ts'
import { scalarToNode } from './field-extra.ts'

export type ReturnsSchema = {
  schema: string
  derived: Array<NamedSchema>
}

export function returnsToSchema(
  returns: Returns,
  location: SourceLocation,
): ReturnsSchema {
  const { type } = returns
  const declared = typeToDeclaredSchemas(type, location)
  if (returns.form === 'type' && type.kind === 'schema') {
    return { schema: type.schema, derived: declared }
  }
  const derived: NamedSchema = {
    name: returns.name ?? returnsToDefaultName(returns),
    node: returnsToNode(returns),
    location,
    derived: true,
  }
  return { schema: derived.name, derived: [...declared, derived] }
}

function typeToDeclaredSchemas(
  type: ReturnedType,
  location: SourceLocation,
): Array<NamedSchema> {
  if (type.kind !== 'schema' || type.declared === undefined) {
    return []
  }
  return [{ name: type.schema, node: type.declared, location, derived: true }]
}

function returnsToDefaultName(returns: Returns): string {
  const name = typeToName(returns.type)
  switch (returns.form) {
    case 'type':
      return name
    case 'nullable':
      return orNull(name, true)
    case 'list':
      return orNull(
        `${orNull(name, returns.nullableItems)}List`,
        returns.nullable,
      )
  }
}

function returnsToNode(returns: Returns): SchemaNode {
  const node = typeToNode(returns.type)
  switch (returns.form) {
    case 'type':
      return node
    case 'nullable':
      return { ...node, nullable: true }
    case 'list': {
      const list: SchemaNode = { type: 'array', items: node }
      if (returns.nullableItems) {
        list.items = { ...node, nullable: true }
      }
      if (returns.nullable) {
        list.nullable = true
      }
      return list
    }
  }
}

function typeToName(type: ReturnedType): string {
  switch (type.kind) {
    case 'schema':
      return type.schema
    case 'primitive':
      return `${type.type.charAt(0).toUpperCase()}${type.type.slice(1)}`
    case 'scalar':
      return type.scalar
  }
}

function typeToNode(type: ReturnedType): SchemaNode {
  switch (type.kind) {
    case 'schema':
      return { type: 'ref', schema: type.schema }
    case 'primitive':
      return { type: type.type }
    case 'scalar':
      return scalarToNode(type.scalar)
  }
}

function orNull(name: string, nullable: boolean): string {
  if (!nullable) {
    return name
  }
  return `${name}OrNull`
}
