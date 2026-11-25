import { ignoreDecoratedElement } from './decorator.ts'
import type { BidirektDecorator, BidirektSchemaClass } from './decorator.ts'

type BidirektPrimitive = 'string' | 'integer' | 'float' | 'number' | 'boolean'

type BidirektNestedType<T extends string> = T | `${T}[]` | `map<${T}>`

export type BidirektFieldType = BidirektNestedType<
  BidirektNestedType<BidirektNestedType<BidirektPrimitive>>
>

export type BidirektBody =
  | BidirektSchemaClass
  | readonly [BidirektSchemaClass]
  | { list: BidirektSchemaClass; name?: string }
  | null

export interface BidirektSchemaOptions {
  name?: string
}

export interface BidirektFieldOptions {
  type?: BidirektFieldType
  name?: string
  optional?: boolean
  nullable?: boolean
  description?: string
  union?: Record<string, BidirektSchemaClass>
}

export function BidirektSchema(
  _options?: BidirektSchemaOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}

export function BidirektField(
  _options?: BidirektFieldOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}

export * from './protocols/rest.ts'
export * from './protocols/graphql.ts'
