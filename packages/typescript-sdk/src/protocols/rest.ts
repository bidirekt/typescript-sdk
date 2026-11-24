import type { BidirektBody } from '../index.ts'

type BidirektDecorator = (
  target: unknown,
  context?: unknown,
  descriptor?: unknown,
) => void

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

function ignoreDecoratedElement(): undefined {
  return undefined
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
