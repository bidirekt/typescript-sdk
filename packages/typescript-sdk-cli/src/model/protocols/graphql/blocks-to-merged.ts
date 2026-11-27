import { compareLocations } from '../../contract.ts'
import type { SourceLocation } from '../../contract.ts'
import type { Diagnostic } from '../../diagnostic.ts'
import type { MergedBlock, SideBlock } from '../../../protocols.ts'
import type { Graph, GraphqlBlock, Operation, SchemaUse } from './contract.ts'

type Conflict = {
  message: string
  first: SourceLocation
  other: SourceLocation
}

export function sideBlocksToMerged(
  sideBlocks: Array<SideBlock<GraphqlBlock>>,
): MergedBlock<GraphqlBlock> {
  const [{ provider }] = sideBlocks
  const errors = new Map<string, Diagnostic>()
  const addConflict = ({ message, first, other }: Conflict): void => {
    for (const location of [first, other]) {
      errors.set(`${location.file}:${location.line} ${message}`, {
        message,
        location,
      })
    }
  }
  const blocks = sideBlocks.map(({ block }) => block)
  const block: GraphqlBlock = { operations: [] }
  if (provider === undefined) {
    block.graph = graphsToMerged(
      blocks.flatMap(({ graph }) => graph ?? []),
      addConflict,
    )
  } else {
    block.operations = operationsToMerged(
      blocks.flatMap(({ operations }) => operations),
      provider,
      addConflict,
    )
  }
  return { block, errors: [...errors.values()] }
}

function graphsToMerged(
  graphs: Array<Graph>,
  addConflict: (conflict: Conflict) => void,
): Graph {
  const [first, ...others] = [...graphs].sort((a, b) =>
    compareLocations(a.location, b.location),
  )
  for (const other of others) {
    if (other.name !== first.name) {
      addConflict({
        message: `the graph is declared as "${first.name}" and "${other.name}": declare one graph name in every @BidirektGraph`,
        first: first.location,
        other: other.location,
      })
    }
  }
  return first
}

function operationsToMerged(
  operations: Array<Operation>,
  provider: string,
  addConflict: (conflict: Conflict) => void,
): Array<Operation> {
  const merged: Array<Operation> = []
  for (const group of Map.groupBy(operations, operationToKey).values()) {
    const [first, ...others] = group
    const operation = `${first.kind} ${first.name} consumed from "${provider}"`
    for (const other of others) {
      const conflicts = [
        usesToConflict('arguments', first, other, operation),
        usesToConflict('returns', first, other, operation),
      ]
      for (const conflict of conflicts) {
        if (conflict !== undefined) {
          addConflict(conflict)
        }
      }
    }
    merged.push(first)
  }
  return merged
}

function usesToConflict(
  use: 'arguments' | 'returns',
  first: Operation,
  other: Operation,
  operation: string,
): Conflict | undefined {
  const firstUse: SchemaUse | undefined = first[use]
  const otherUse: SchemaUse | undefined = other[use]
  if (firstUse?.schema === otherUse?.schema) {
    return undefined
  }
  if (firstUse === undefined || otherUse === undefined) {
    return {
      message: `${use} of ${operation} is declared in one handler and not in another: declare the same ${use} in every handler`,
      first: firstUse?.location ?? first.location,
      other: otherUse?.location ?? other.location,
    }
  }
  return {
    message: `${use} of ${operation} is declared as ${firstUse.schema} and ${otherUse.schema}: declare the same ${use} in every handler`,
    first: firstUse.location,
    other: otherUse.location,
  }
}

function operationToKey(operation: Operation): string {
  return JSON.stringify([operation.kind, operation.name])
}
