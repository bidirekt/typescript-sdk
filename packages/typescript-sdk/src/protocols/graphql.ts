import { ignoreDecoratedElement } from '../decorator.ts'
import type { BidirektDecorator, BidirektSchemaClass } from '../decorator.ts'
import type { BidirektFieldOptions, BidirektFieldType } from '../index.ts'

type BidirektGraphqlPrimitive = Exclude<
  BidirektFieldType,
  `${string}[]` | `map<${string}>`
>

type BidirektGraphqlType =
  | BidirektSchemaClass
  | BidirektGraphqlPrimitive
  | { scalar: string; name?: string }
  | { enum: ReadonlyArray<string>; name: string }
  | { union: Record<string, BidirektSchemaClass>; name: string }

type BidirektGraphqlReturns =
  | BidirektGraphqlType
  | `${BidirektGraphqlPrimitive}[]`
  | readonly [BidirektGraphqlType]
  | {
      list: BidirektGraphqlType
      nullable?: true
      nullableItems?: true
      name?: string
    }
  | { nullable: BidirektGraphqlType; name?: string }

type BidirektGraphqlOperation =
  { query: string; mutation?: never } | { mutation: string; query?: never }

export type BidirektGraphqlConsumerOptions = BidirektGraphqlOperation & {
  provider: string
  arguments?: BidirektSchemaClass
  returns: BidirektGraphqlReturns
}

export interface BidirektGraphqlFieldOptions extends BidirektFieldOptions {
  scalar?: string
  arguments?: BidirektSchemaClass
}

export function BidirektGraphqlConsumer(
  _options: BidirektGraphqlConsumerOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}

export function BidirektGraphqlField(
  _options?: BidirektGraphqlFieldOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}

export function BidirektGraph(_name: string): BidirektDecorator {
  return ignoreDecoratedElement
}
