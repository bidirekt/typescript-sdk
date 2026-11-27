import { Pair, YAMLMap } from 'yaml'
import type {
  GraphqlBlock,
  Operation,
} from '../../../model/protocols/graphql/contract.ts'
import { compareBytes } from '../../contract-to-yaml.ts'

const operationKinds = ['query', 'mutation'] as const

export function blockToYaml(block: GraphqlBlock): YAMLMap {
  const graphql = new YAMLMap()
  if (block.graph !== undefined) {
    graphql.add(new Pair('graph', block.graph.name))
  }
  const byKind = Map.groupBy(block.operations, ({ kind }) => kind)
  for (const kind of operationKinds) {
    const operations = byKind.get(kind)
    if (operations === undefined) {
      continue
    }
    const fields = new YAMLMap()
    const sorted = [...operations].sort((a, b) => compareBytes(a.name, b.name))
    for (const operation of sorted) {
      fields.add(new Pair(operation.name, operationToYaml(operation)))
    }
    graphql.add(new Pair(kind, fields))
  }
  return graphql
}

function operationToYaml(operation: Operation): YAMLMap {
  const field = new YAMLMap()
  if (operation.arguments !== undefined) {
    field.add(new Pair('arguments', operation.arguments.schema))
  }
  field.add(new Pair('returns', operation.returns.schema))
  return field
}
