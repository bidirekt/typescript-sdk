import ts from 'typescript'
import type { NamedSchema } from '../model/contract.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { pathToShown } from './location.ts'
import {
  declarationToScript,
  isBuildOutput,
  isInstalledFile,
} from './program.ts'
import { symbolToTarget } from './sdk-references.ts'

export type SchemaDeclaration =
  ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration

export type SchemaMember = ts.PropertyDeclaration | ts.PropertySignature

export type SchemaContext = {
  program: ts.Program
  checker: ts.TypeChecker
  cwd: string
  schemaDeclarations: Map<SchemaDeclaration, string>
  namedSchemas: Map<ts.Node, NamedSchema>
  hints: FormHints
}

export type FormHints = {
  declareType: string
  declareFieldType: string
  declareUnion: string
  declareName: string
  schemaAnnotation: string
  addSchema: string
  placeUnion: string
  annotateField: string
  builtDeclaration: string
  readsDeclarationFiles: boolean
}

const decoratorHints: FormHints = {
  declareType: '@BidirektField({ type })',
  declareFieldType: '@BidirektField({ type })',
  declareUnion: '@BidirektField({ union })',
  declareName: '@BidirektField({ name })',
  schemaAnnotation: '@BidirektSchema',
  addSchema: 'add @BidirektSchema to it',
  placeUnion: 'the "union" of @BidirektField',
  annotateField: '@BidirektField',
  builtDeclaration: 'which has no decorators',
  readsDeclarationFiles: false,
}

export const tagHints: FormHints = {
  declareType: '"@bidirekt field type=<type>"',
  declareFieldType: '"@bidirekt field type=<type>"',
  declareUnion: '"@bidirekt field union={<key>: <schema>, ...}"',
  declareName: '"@bidirekt field name=<name>"',
  schemaAnnotation: '"@bidirekt schema"',
  addSchema: 'add "@bidirekt schema" above it',
  placeUnion: 'the "union=" of "@bidirekt field"',
  annotateField: '"@bidirekt field"',
  builtDeclaration:
    'which is build output, so its "@bidirekt" tags are not read',
  readsDeclarationFiles: true,
}

export const javaScriptTagHints: FormHints = {
  ...tagHints,
  declareFieldType: '"@bidirekt field type=<type>" or a JSDoc @type',
}

export function programToSchemaContext(
  program: ts.Program,
  cwd: string,
): SchemaContext {
  return {
    program,
    checker: program.getTypeChecker(),
    cwd,
    schemaDeclarations: new Map(),
    namedSchemas: new Map(),
    hints: decoratorHints,
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
  return symbolToScriptSymbol(symbolToTarget(symbol, context.checker), context)
}

function symbolToScriptSymbol(
  symbol: ts.Symbol,
  context: SchemaContext,
): ts.Symbol {
  const files = new Set(
    (symbol.declarations ?? []).map((declaration) =>
      declaration.getSourceFile(),
    ),
  )
  const [file] = files
  if (files.size !== 1) {
    return symbol
  }
  const script = declarationToScript(context.program, file)
  const module = script && context.checker.getSymbolAtLocation(script)
  if (module === undefined) {
    return symbol
  }
  const exported = context.checker
    .getExportsOfModule(module)
    .find((candidate) => candidate.name === symbol.name)
  if (exported === undefined) {
    return symbol
  }
  const target = symbolToTarget(exported, context.checker)
  if (!(target.declarations ?? []).some(isObjectDeclaration)) {
    return symbol
  }
  return target
}

export function isShadowedByScript(
  declaration: SchemaDeclaration,
  context: SchemaContext,
): boolean {
  const symbol =
    declaration.name && context.checker.getSymbolAtLocation(declaration.name)
  return (
    symbol !== undefined && symbolToScriptSymbol(symbol, context) !== symbol
  )
}

export function memberToOwner(member: SchemaMember): ts.Node {
  const owner = member.parent
  if (ts.isTypeLiteralNode(owner) && ts.isTypeAliasDeclaration(owner.parent)) {
    return owner.parent
  }
  return owner
}

export function isObjectDeclaration(node: ts.Node): node is SchemaDeclaration {
  return (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type))
  )
}

export function symbolToSchemaName(
  symbol: ts.Symbol,
  context: SchemaContext,
): string | undefined {
  const script = symbolToScriptSymbol(symbol, context)
  for (const declaration of [
    ...(symbol.declarations ?? []),
    ...(script.declarations ?? []),
  ]) {
    if (isObjectDeclaration(declaration)) {
      const name = context.schemaDeclarations.get(declaration)
      if (name !== undefined) {
        return name
      }
    }
  }
  return undefined
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
  return (
    symbolToSchemaName(symbol, context) ?? classToDiagnostic(symbol, context)
  )
}

export function classToDiagnostic(
  symbol: ts.Symbol,
  context: SchemaContext,
): Diagnostic {
  return (
    unreadClassToDiagnostic(symbol, context) ?? {
      message: `cannot translate class "${classToName(symbol)}": ${context.hints.addSchema}`,
    }
  )
}

export function unreadClassToDiagnostic(
  symbol: ts.Symbol,
  context: SchemaContext,
): Diagnostic | undefined {
  return (
    builtDeclarationToDiagnostic(symbol, context) ??
    declaredClassToDiagnostic(symbol, context)
  )
}

function declaredClassToDiagnostic(
  symbol: ts.Symbol,
  context: SchemaContext,
): Diagnostic | undefined {
  const file = symbolToClass(symbol)?.getSourceFile()
  if (file === undefined || !isProjectDeclarationFile(file, context)) {
    return undefined
  }
  return {
    message: `class "${classToName(symbol)}" is declared in "${pathToShown(file.fileName, context.cwd)}", where only an interface or object type is read: declare it as an interface there, or tag the class in its source`,
  }
}

export function builtDeclarationToDiagnostic(
  symbol: ts.Symbol,
  context: SchemaContext,
): Diagnostic | undefined {
  const declaration =
    symbolToClass(symbol) ?? symbol.declarations?.find(isObjectDeclaration)
  if (declaration === undefined) {
    return undefined
  }
  let hints = tagHints
  let kind = 'type'
  if (ts.isClassDeclaration(declaration)) {
    hints = context.hints
    kind = 'class'
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    kind = 'interface'
  }
  const file = declaration.getSourceFile()
  if (
    !isProjectDeclarationFile(file, context) ||
    (hints.readsDeclarationFiles && !isBuildOutput(context.program, file))
  ) {
    return undefined
  }
  return {
    message: `${kind} "${declaration.name?.text ?? symbol.name}" comes from "${pathToShown(file.fileName, context.cwd)}", ${hints.builtDeclaration}: point the package's "types" or "exports" at its source`,
  }
}

function isProjectDeclarationFile(
  file: ts.SourceFile,
  context: SchemaContext,
): boolean {
  return (
    file.isDeclarationFile &&
    !isInstalledFile(file) &&
    !context.program.isSourceFileDefaultLibrary(file)
  )
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

export function typeToUntranslatableMessage(
  text: string,
  hints: FormHints,
): string {
  return `cannot translate "${text}" to a contract type: declare it with ${hints.declareFieldType}`
}
