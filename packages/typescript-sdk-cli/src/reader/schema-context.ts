import ts from 'typescript'
import type { NamedSchema } from '../model/contract.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { pathToShown } from './location.ts'
import { isInstalledFile } from './program.ts'
import { symbolToTarget } from './sdk-references.ts'

export type SchemaContext = {
  program: ts.Program
  checker: ts.TypeChecker
  cwd: string
  schemaClasses: Map<ts.ClassDeclaration, string>
  namedSchemas: Map<ts.Node, NamedSchema>
}

export function programToSchemaContext(
  program: ts.Program,
  cwd: string,
): SchemaContext {
  return {
    program,
    checker: program.getTypeChecker(),
    cwd,
    schemaClasses: new Map(),
    namedSchemas: new Map(),
  }
}

export function nodeToSymbol(
  node: ts.Node,
  context: SchemaContext,
): ts.Symbol | undefined {
  const symbol = context.checker.getSymbolAtLocation(node)
  if (symbol === undefined) {
    return undefined
  }
  return symbolToTarget(symbol, context.checker)
}

export function symbolToClass(
  symbol: ts.Symbol,
): ts.ClassDeclaration | undefined {
  return symbol.declarations?.find((declaration) =>
    ts.isClassDeclaration(declaration),
  )
}

export function classToSchemaName(
  symbol: ts.Symbol,
  context: SchemaContext,
): string | Diagnostic {
  const declaration = symbolToClass(symbol)
  const name = declaration && context.schemaClasses.get(declaration)
  if (name !== undefined) {
    return name
  }
  return (
    builtClassToDiagnostic(symbol, context) ?? {
      message: `cannot translate class "${classToName(symbol)}": add @BidirektSchema to it`,
    }
  )
}

export function builtClassToDiagnostic(
  symbol: ts.Symbol,
  context: SchemaContext,
): Diagnostic | undefined {
  const file = symbolToClass(symbol)?.getSourceFile()
  if (
    file === undefined ||
    !file.isDeclarationFile ||
    isInstalledFile(file) ||
    context.program.isSourceFileDefaultLibrary(file)
  ) {
    return undefined
  }
  return {
    message: `class "${classToName(symbol)}" comes from "${pathToShown(file.fileName, context.cwd)}", which has no decorators: point the package's "types" or "exports" at its source`,
  }
}

function classToName(symbol: ts.Symbol): string {
  return symbolToClass(symbol)?.name?.text ?? symbol.name
}

export function isLibrarySymbol(
  symbol: ts.Symbol,
  context: SchemaContext,
): boolean {
  return (symbol.declarations ?? []).some((declaration) => {
    const file = declaration.getSourceFile()
    return (
      context.program.isSourceFileDefaultLibrary(file) || isInstalledFile(file)
    )
  })
}

export function isDefaultLibrarySymbol(
  symbol: ts.Symbol,
  context: SchemaContext,
): boolean {
  return (symbol.declarations ?? []).some((declaration) =>
    context.program.isSourceFileDefaultLibrary(declaration.getSourceFile()),
  )
}

export function typeToUntranslatableMessage(text: string): string {
  return `cannot translate "${text}" to a contract type: declare it with @BidirektField({ type })`
}
