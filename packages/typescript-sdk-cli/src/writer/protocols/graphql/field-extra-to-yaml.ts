import { Pair } from 'yaml'
import type { YAMLMap } from 'yaml'
import type { SchemaNode } from '../../../model/contract.ts'
import {
  nodeToArguments,
  nodeToScalar,
} from '../../../model/protocols/graphql/field-extra.ts'

export function fieldExtraToYaml(node: SchemaNode, map: YAMLMap): void {
  const scalar = nodeToScalar(node)
  if (scalar !== undefined) {
    map.set('type', 'scalar')
    map.add(new Pair('name', scalar))
  }
  const schema = nodeToArguments(node)
  if (schema !== undefined) {
    map.add(new Pair('arguments', schema))
  }
}
