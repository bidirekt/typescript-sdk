type BidirektDecorator = (
  target: unknown,
  context?: unknown,
  descriptor?: unknown,
) => void

export type BidirektHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type BidirektPrimitive = 'string' | 'integer' | 'float' | 'number' | 'boolean'

type BidirektNestedType<T extends string> = T | `${T}[]` | `map<${T}>`

export type BidirektFieldType = BidirektNestedType<
  BidirektNestedType<BidirektNestedType<BidirektPrimitive>>
>

type BidirektSchemaClass = abstract new (...args: never) => unknown

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

export interface BidirektProviderOptions {
  method: BidirektHttpMethod
  path: string
  request?: BidirektBody
  responses: Record<number, BidirektBody>
}

export interface BidirektConsumerOptions extends BidirektProviderOptions {
  provider: string
}

function ignoreDecoratedElement(): undefined {
  return undefined
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

export function BidirektProvider(
  _options: BidirektProviderOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}

export function BidirektConsumer(
  _options: BidirektConsumerOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}
