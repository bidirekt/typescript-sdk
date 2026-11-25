import type {
  PrimitiveType,
  SourceLocation,
  UnionMember,
} from '../../contract.ts'

export type OperationKind = 'query' | 'mutation'

export type SchemaUse = {
  schema: string
  location: SourceLocation
}

export type Operation = {
  kind: OperationKind
  name: string
  arguments?: SchemaUse
  returns: SchemaUse
  location: SourceLocation
}

export type Graph = {
  name: string
  location: SourceLocation
}

export type GraphqlBlock = {
  operations: Array<Operation>
  graph?: Graph
}

export type ReturnedType =
  | { kind: 'schema'; schema: string }
  | { kind: 'primitive'; type: PrimitiveType }
  | { kind: 'scalar'; scalar: string; name?: string }
  | { kind: 'enum'; members: Array<string>; name: string }
  | { kind: 'union'; members: Array<UnionMember>; name: string }

export type Returns =
  | { form: 'type'; type: ReturnedType; name?: string }
  | { form: 'nullable'; type: ReturnedType; name?: string }
  | {
      form: 'list'
      type: ReturnedType
      nullable: boolean
      nullableItems: boolean
      name?: string
    }
