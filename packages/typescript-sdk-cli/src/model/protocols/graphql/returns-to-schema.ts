import type { NamedSchema, SchemaNode, SourceLocation } from '../../contract.ts'
import type { ReturnedType, Returns } from './contract.ts'
import { scalarToNode } from './field-extra.ts'

export type ReturnsSchema = {
  schema: string
  derived?: NamedSchema
}

export function returnsToSchema(
  returns: Returns,
  location: SourceLocation,
): ReturnsSchema {
  const { type } = returns
  if (returns.form === 'type' && type.kind === 'schema') {
    return { schema: type.schema }
  }
  const derived: NamedSchema = {
    name: returns.name ?? returnsToDefaultName(returns),
    node: returnsToNode(returns),
    location,
    derived: true,
  }
  return { schema: derived.name, derived }
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
      return type.name ?? type.scalar
    case 'enum':
      return type.name
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
    case 'enum':
      return { type: 'enum', members: type.members }
  }
}

function orNull(name: string, nullable: boolean): string {
  if (!nullable) {
    return name
  }
  return `${name}OrNull`
}
