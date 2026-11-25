import { ignoreDecoratedElement } from '../decorator.ts'
import type { BidirektDecorator } from '../decorator.ts'
import type { BidirektBody } from '../index.ts'

export type BidirektRestHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface BidirektRestProviderOptions {
  method: BidirektRestHttpMethod
  path: string
  request?: BidirektBody
  responses: Record<number, BidirektBody>
}

export interface BidirektRestConsumerOptions extends BidirektRestProviderOptions {
  provider: string
}

export function BidirektRestProvider(
  _options: BidirektRestProviderOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}

export function BidirektRestConsumer(
  _options: BidirektRestConsumerOptions,
): BidirektDecorator {
  return ignoreDecoratedElement
}
