import ts from 'typescript'
import { descriptionToDiagnostic } from '../model/description.ts'
import { isDiagnostic } from '../model/diagnostic.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { nodeToLocation } from './location.ts'

export type LiteralOptions = Map<string, ts.Expression>

export function propertyNameToText(name: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text
  }
  return undefined
}

export function expressionToLiteralOptions(
  expression: ts.Expression | undefined,
  what: string,
  known?: ReadonlyArray<string>,
  computedKeyToMessage?: (key: ts.ComputedPropertyName) => string,
): LiteralOptions | Diagnostic {
  const options: LiteralOptions = new Map()
  if (expression === undefined) {
    return options
  }
  const invalid = {
    message: `${what} must be an object literal written in place`,
    location: nodeToLocation(expression),
  }
  if (!ts.isObjectLiteralExpression(expression)) {
    return invalid
  }
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) {
      return invalid
    }
    if (
      ts.isComputedPropertyName(property.name) &&
      computedKeyToMessage !== undefined
    ) {
      return {
        message: computedKeyToMessage(property.name),
        location: nodeToLocation(property.name),
      }
    }
    const name = propertyNameToText(property.name)
    if (name === undefined) {
      return invalid
    }
    if (known !== undefined && !known.includes(name)) {
      return {
        message: `unknown option "${name}" in ${what}: write ${namesToChoice(known)}`,
        location: nodeToLocation(property.name),
      }
    }
    if (options.has(name)) {
      return {
        message: `"${name}" is declared more than once in ${what}: keep one`,
        location: nodeToLocation(property.name),
      }
    }
    options.set(name, property.initializer)
  }
  return options
}

export function computedKeyToValue(
  key: ts.ComputedPropertyName,
  checker: ts.TypeChecker,
): string | undefined {
  const type = checker.getTypeAtLocation(key.expression)
  if (type.isStringLiteral() || type.isNumberLiteral()) {
    return String(type.value)
  }
  return undefined
}

export function namesToChoice(names: ReadonlyArray<string>): string {
  if (names.length === 1) {
    return names[0]
  }
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

export function literalOptionToStringLiteral(
  options: LiteralOptions,
  name: string,
): ts.StringLiteralLike | undefined | Diagnostic {
  const value = options.get(name)
  if (value === undefined) {
    return undefined
  }
  if (ts.isStringLiteralLike(value)) {
    return value
  }
  return {
    message: `"${name}" must be a string literal written in place`,
    location: nodeToLocation(value),
  }
}

export function literalOptionToString(
  options: LiteralOptions,
  name: string,
): string | undefined | Diagnostic {
  const literal = literalOptionToStringLiteral(options, name)
  if (literal === undefined || isDiagnostic(literal)) {
    return literal
  }
  return literal.text
}

export function literalOptionToName(
  options: LiteralOptions,
  name: string,
): string | undefined | Diagnostic {
  const literal = literalOptionToStringLiteral(options, name)
  if (literal === undefined || isDiagnostic(literal)) {
    return literal
  }
  if (literal.text === '') {
    return {
      message: `"${name}" is empty: write a name or leave "${name}" out`,
      location: nodeToLocation(literal),
    }
  }
  return literal.text
}

export function literalOptionToDescription(
  options: LiteralOptions,
): string | undefined | Diagnostic {
  const literal = literalOptionToStringLiteral(options, 'description')
  if (literal === undefined || isDiagnostic(literal)) {
    return literal
  }
  return (
    descriptionToDiagnostic(literal.text, nodeToLocation(literal)) ??
    literal.text
  )
}

export function literalOptionToBoolean(
  options: LiteralOptions,
  name: string,
): boolean | undefined | Diagnostic {
  const value = options.get(name)
  if (value === undefined) {
    return undefined
  }
  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  return {
    message: `"${name}" must be true or false written in place`,
    location: nodeToLocation(value),
  }
}
