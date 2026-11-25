export type BidirektDecorator = (
  target: unknown,
  context?: unknown,
  descriptor?: unknown,
) => void

export type BidirektSchemaClass = abstract new (...args: never) => unknown

export function ignoreDecoratedElement(): undefined {
  return undefined
}
