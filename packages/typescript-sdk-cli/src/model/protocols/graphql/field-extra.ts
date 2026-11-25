import type { SchemaNode } from '../../contract.ts'
import type { OptionValue } from '../../../protocols.ts'

type GraphqlExtra = {
  scalar?: string
  arguments?: string
}

const extraKey = 'graphql'

export const fieldOptions = ['scalar', 'arguments']

export function scalarToNode(scalar: string): SchemaNode {
  return withExtra({ type: 'string' }, { scalar })
}

export function nodeToScalar(node: SchemaNode): string | undefined {
  return nodeToExtra(node).scalar
}

export function nodeToArguments(node: SchemaNode): string | undefined {
  return nodeToExtra(node).arguments
}

export function fieldOptionsToNode(
  options: Record<string, OptionValue>,
  node: SchemaNode,
): SchemaNode {
  let graphqlNode = node
  if (Object.hasOwn(options, 'scalar')) {
    graphqlNode = nodeToScalarNode(node, options.scalar)
  }
  if (Object.hasOwn(options, 'arguments')) {
    graphqlNode = withExtra(graphqlNode, { arguments: options.arguments })
  }
  return graphqlNode
}

export function nodeToArgumentsSchemas(node: SchemaNode): Array<string> {
  const schema = nodeToArguments(node)
  if (schema === undefined) {
    return []
  }
  return [schema]
}

function nodeToScalarNode(node: SchemaNode, scalar: string): SchemaNode {
  if (node.type === 'array') {
    return { ...node, items: nodeToScalarNode(node.items, scalar) }
  }
  const scalarNode = scalarToNode(scalar)
  if (node.optional !== undefined) {
    scalarNode.optional = node.optional
  }
  if (node.nullable !== undefined) {
    scalarNode.nullable = node.nullable
  }
  if (node.description !== undefined) {
    scalarNode.description = node.description
  }
  return scalarNode
}

function nodeToExtra(node: SchemaNode): GraphqlExtra {
  const extra = node.extra?.[extraKey]
  if (typeof extra !== 'object' || extra === null) {
    return {}
  }
  return extra
}

function withExtra(node: SchemaNode, extra: GraphqlExtra): SchemaNode {
  return {
    ...node,
    extra: {
      ...node.extra,
      [extraKey]: { ...nodeToExtra(node), ...extra },
    },
  }
}
