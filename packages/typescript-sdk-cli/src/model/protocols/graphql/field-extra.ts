import type { PrimitiveType, SchemaNode } from '../../contract.ts'
import type { OptionValue } from '../../../protocols.ts'

type GraphqlExtra = {
  scalar?: string
  arguments?: string
}

export const fieldOptions = ['scalar', 'arguments']

export const primitiveNames: ReadonlyMap<string, PrimitiveType> = new Map([
  ['Int', 'integer'],
  ['Float', 'float'],
  ['Boolean', 'boolean'],
  ['String', 'string'],
  ['ID', 'string'],
])

export function scalarToNode(scalar: string): SchemaNode {
  return withExtra({ type: 'string' }, { scalar })
}

export function nodeToScalar(node: SchemaNode): string | undefined {
  return nodeToExtraText(node, 'scalar')
}

export function nodeToArguments(node: SchemaNode): string | undefined {
  return nodeToExtraText(node, 'arguments')
}

export function fieldOptionsToLeaf(
  options: Record<string, OptionValue>,
): SchemaNode | undefined {
  if (!Object.hasOwn(options, 'scalar')) {
    return undefined
  }
  return scalarToNode(options.scalar)
}

export function fieldOptionsToNode(
  options: Record<string, OptionValue>,
  node: SchemaNode,
): SchemaNode {
  if (!Object.hasOwn(options, 'arguments')) {
    return node
  }
  return withExtra(node, { arguments: options.arguments })
}

export function nodeToArgumentsSchemas(node: SchemaNode): Array<string> {
  const schema = nodeToArguments(node)
  if (schema === undefined) {
    return []
  }
  return [schema]
}

function nodeToExtraText(
  node: SchemaNode,
  key: keyof GraphqlExtra,
): string | undefined {
  const text = node.extra?.[key]
  if (typeof text !== 'string') {
    return undefined
  }
  return text
}

function withExtra(node: SchemaNode, extra: GraphqlExtra): SchemaNode {
  return { ...node, extra: { ...node.extra, ...extra } }
}
