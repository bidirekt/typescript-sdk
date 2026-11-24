export type SourceLocation = {
  file: string
  line: number
}

export type PrimitiveType =
  'string' | 'integer' | 'float' | 'number' | 'boolean'

export type NodeFlags = {
  optional?: boolean
  nullable?: boolean
  description?: string
}

export type Property = {
  name: string
  node: SchemaNode
  location: SourceLocation
}

export type UnionMember = {
  key: string
  node: SchemaNode
}

export type SchemaNode = NodeFlags &
  (
    | { type: PrimitiveType }
    | { type: 'object'; properties: Array<Property> }
    | { type: 'array'; items: SchemaNode }
    | { type: 'map'; values: SchemaNode }
    | { type: 'enum'; members: Array<string> }
    | { type: 'union'; members: Array<UnionMember> }
    | { type: 'ref'; schema: string }
  )

export type NamedSchema = {
  name: string
  node: SchemaNode
  location: SourceLocation
}
