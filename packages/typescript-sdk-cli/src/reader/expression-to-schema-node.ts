import ts from 'typescript'
import type { UnionMember } from '../model/contract.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import {
  computedKeyToValue,
  expressionToLiteralOptions,
} from './literal-options.ts'
import { nodeToLocation } from './location.ts'
import { classToSchemaName, nodeToSymbol } from './schema-context.ts'
import type { SchemaContext } from './schema-context.ts'

export type SchemaRef = { type: 'ref'; schema: string }

export function expressionToSchemaRef(
  expression: ts.Expression,
  context: SchemaContext,
): SchemaRef | Diagnostic {
  if (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression)
  ) {
    const symbol = nodeToSymbol(referenceToName(expression), context)
    if (symbol !== undefined && symbol.flags & ts.SymbolFlags.Class) {
      return classToSchemaRef(symbol, expression, context)
    }
  }
  return {
    message: `cannot read "${expression.getText()}" as a schema: reference a @BidirektSchema class`,
    location: nodeToLocation(expression),
  }
}

export function expressionToUnionMembers(
  expression: ts.Expression | undefined,
  what: string,
  context: SchemaContext,
): Array<UnionMember> | Diagnostic {
  const options = expressionToLiteralOptions(
    expression,
    what,
    undefined,
    (key) => {
      const value = computedKeyToValue(key, context.checker) ?? 'the key'
      return `union key "${key.getText()}" must be written in place: write ${value}`
    },
  )
  if (isDiagnostic(options)) {
    return options
  }
  const members: Array<UnionMember> = []
  for (const [key, value] of options) {
    const node = expressionToSchemaRef(value, context)
    if (isDiagnostic(node)) {
      return node
    }
    members.push({ key, node })
  }
  return members
}

function referenceToName(
  expression: ts.Identifier | ts.PropertyAccessExpression,
): ts.Node {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name
  }
  return expression
}

function classToSchemaRef(
  symbol: ts.Symbol,
  expression: ts.Expression,
  context: SchemaContext,
): SchemaRef | Diagnostic {
  const name = classToSchemaName(symbol, context)
  if (isDiagnostic(name)) {
    return { ...name, location: nodeToLocation(expression) }
  }
  return { type: 'ref', schema: name }
}
