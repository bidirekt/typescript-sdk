import ts from 'typescript'
import type { SourceLocation } from '../model/contract.ts'
import type { ProtocolModule } from '../protocols.ts'
import { nodeToLocation } from './location.ts'
import { programToUserFiles, sdkPackage } from './program.ts'
import type { ProjectProgram } from './program.ts'

export type DecoratorTarget = {
  isTarget: (node: ts.Node) => boolean
  description: string
}

export type SdkDecorator = {
  use: 'decorator'
  name: string
  protocol?: string
  call: ts.CallExpression
  decorator: ts.Decorator
  location: SourceLocation
}

export type SdkReference =
  | SdkDecorator
  | {
      use: 'misplaced' | 'unregistered' | 'unexported'
      name: string
      message: string
      location: SourceLocation
    }

type RegisteredTarget = DecoratorTarget & {
  protocol?: string
}

type FoundReference = {
  name: string
  expression: ts.Identifier | ts.PropertyAccessExpression
  call: ts.CallExpression | undefined
  location: SourceLocation
}

type SdkModule = {
  symbol: ts.Symbol
  names: ReadonlySet<string>
  functions: ReadonlyMap<ts.Symbol, string>
}

type ImportedNames = {
  from: ts.Node
  names: ReadonlyArray<ts.ModuleExportName>
}

export const fieldTarget: DecoratorTarget = {
  isTarget: (node) => ts.isPropertyDeclaration(node) && !isStatic(node),
  description: 'a property',
}

const coreTargets: Record<string, DecoratorTarget> = {
  BidirektSchema: {
    isTarget: ts.isClassDeclaration,
    description: 'a class declaration',
  },
  BidirektField: fieldTarget,
}

export function protocolsToDecoratorTargets(
  protocols: ReadonlyArray<ProtocolModule>,
): Map<string, RegisteredTarget> {
  return new Map<string, RegisteredTarget>([
    ...Object.entries(coreTargets),
    ...protocols.flatMap(({ name, exports }) =>
      Object.entries(exports).map(
        ([exported, target]): [string, RegisteredTarget] => [
          exported,
          { ...target, protocol: name },
        ],
      ),
    ),
  ])
}

export function programToSdkReferences(
  projectProgram: ProjectProgram,
  protocols: ReadonlyArray<ProtocolModule>,
): Array<SdkReference> {
  const targets = protocolsToDecoratorTargets(protocols)
  const checker = projectProgram.program.getTypeChecker()
  const sdk = programToSdkModule(projectProgram, checker)
  const found: Array<FoundReference> = []
  const unexported: Array<SdkReference> = []
  if (sdk === undefined) {
    return []
  }
  const pending: Array<ts.Node> = programToUserFiles(projectProgram)
    .filter((file) => !file.isDeclarationFile)
    .reverse()
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    unexported.push(...nodeToUnexported(node, checker, sdk))
    if (
      ts.isImportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node) ||
      ts.isExportDeclaration(node) ||
      ts.isTypeNode(node) ||
      isImportBinding(node, checker)
    ) {
      continue
    }
    if (ts.isIdentifier(node)) {
      const name = identifierToSdkExportName(node, checker, sdk.functions)
      if (name !== undefined) {
        const expression = identifierToExpression(node)
        found.push({
          name,
          expression,
          call: expressionToCall(expression),
          location: nodeToLocation(node),
        })
      }
      continue
    }
    const children = nodeToChildren(node)
    for (let index = children.length - 1; index >= 0; index--) {
      pending.push(children[index])
    }
  }
  return [...foundToSdkReferences(found, targets), ...unexported]
}

function nodeToUnexported(
  node: ts.Node,
  checker: ts.TypeChecker,
  sdk: SdkModule,
): Array<SdkReference> {
  const imported = nodeToImportedNames(node)
  if (imported === undefined || !isSdkModule(imported.from, checker, sdk)) {
    return []
  }
  return imported.names
    .filter(({ text }) => !sdk.names.has(text))
    .map((name) => ({
      use: 'unexported',
      name: name.text,
      message: `${name.text} is not exported by ${sdkPackage}, so it is not read`,
      location: nodeToLocation(name),
    }))
}

function nodeToImportedNames(node: ts.Node): ImportedNames | undefined {
  if (
    ts.isImportDeclaration(node) &&
    node.importClause?.namedBindings !== undefined &&
    ts.isNamedImports(node.importClause.namedBindings)
  ) {
    return {
      from: node.moduleSpecifier,
      names: node.importClause.namedBindings.elements.map(specifierToName),
    }
  }
  if (
    ts.isExportDeclaration(node) &&
    node.moduleSpecifier !== undefined &&
    node.exportClause !== undefined &&
    ts.isNamedExports(node.exportClause)
  ) {
    return {
      from: node.moduleSpecifier,
      names: node.exportClause.elements.map(specifierToName),
    }
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isQualifiedName(node.moduleReference)
  ) {
    return {
      from: node.moduleReference.left,
      names: [node.moduleReference.right],
    }
  }
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
    return { from: node.expression, names: [node.name] }
  }
  if (ts.isBindingElement(node)) {
    return requireBindingToImportedNames(node)
  }
  return undefined
}

function specifierToName(
  specifier: ts.ImportSpecifier | ts.ExportSpecifier,
): ts.ModuleExportName {
  return specifier.propertyName ?? specifier.name
}

function requireBindingToImportedNames(
  binding: ts.BindingElement,
): ImportedNames | undefined {
  const name = binding.propertyName ?? binding.name
  const declaration = binding.parent.parent
  if (
    !ts.isObjectBindingPattern(binding.parent) ||
    !ts.isVariableDeclaration(declaration) ||
    declaration.initializer === undefined ||
    !ts.isCallExpression(declaration.initializer) ||
    !(ts.isIdentifier(name) || ts.isStringLiteral(name))
  ) {
    return undefined
  }
  const specifier = declaration.initializer.arguments.at(0)
  if (specifier === undefined) {
    return undefined
  }
  return { from: specifier, names: [name] }
}

function isSdkModule(
  node: ts.Node,
  checker: ts.TypeChecker,
  sdk: SdkModule,
): boolean {
  const symbol = checker.getSymbolAtLocation(node)
  return symbol !== undefined && symbolToTarget(symbol, checker) === sdk.symbol
}

function nodeToChildren(node: ts.Node): Array<ts.Node> {
  const children: Array<ts.Node> = []
  ts.forEachChild(node, (child) => {
    children.push(child)
  })
  return children
}

function isImportBinding(node: ts.Node, checker: ts.TypeChecker): boolean {
  if (!ts.isBindingElement(node)) {
    return false
  }
  const symbol = checker.getSymbolAtLocation(node.name)
  return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
}

export function isStatic(property: ts.Declaration): boolean {
  return (ts.getCombinedModifierFlags(property) & ts.ModifierFlags.Static) !== 0
}

function foundToSdkReferences(
  found: Array<FoundReference>,
  targets: ReadonlyMap<string, RegisteredTarget>,
): Array<SdkReference> {
  return found.map(({ name, expression, call, location }): SdkReference => {
    const target = targets.get(name)
    if (target === undefined) {
      return {
        use: 'unregistered',
        name,
        message: `${name}: no registered protocol reads it`,
        location,
      }
    }
    if (
      call !== undefined &&
      ts.isDecorator(call.parent) &&
      target.isTarget(call.parent.parent)
    ) {
      const decorator: SdkDecorator = {
        use: 'decorator',
        name,
        call,
        decorator: call.parent,
        location,
      }
      if (target.protocol !== undefined) {
        decorator.protocol = target.protocol
      }
      return decorator
    }
    return {
      use: 'misplaced',
      name,
      message: misplacedToMessage(name, target, targets, expression, call),
      location,
    }
  })
}

function misplacedToMessage(
  name: string,
  target: DecoratorTarget,
  targets: ReadonlyMap<string, DecoratorTarget>,
  expression: ts.Expression,
  call: ts.CallExpression | undefined,
): string {
  if (call !== undefined && ts.isDecorator(call.parent)) {
    return `@${name} is on ${elementToDescription(call.parent.parent, targets)}, so it is not read: put it on ${target.description}`
  }
  if (ts.isDecorator(expression.parent)) {
    return `@${name} is not called, so it is not read: write @${name}()`
  }
  return `${name} is not written as a decorator, so it is not read: write @${name}() on ${target.description}`
}

function elementToDescription(
  element: ts.Node,
  targets: ReadonlyMap<string, DecoratorTarget>,
): string {
  if (ts.isClassExpression(element)) {
    return 'a class expression'
  }
  if (ts.isGetAccessor(element) || ts.isSetAccessor(element)) {
    return 'an accessor'
  }
  if (ts.isParameter(element)) {
    return 'a parameter'
  }
  if (ts.isPropertyDeclaration(element) && isStatic(element)) {
    return 'a static property'
  }
  const target = [...targets.values()].find(({ isTarget }) => isTarget(element))
  return target?.description ?? 'this element'
}

function programToSdkModule(
  { program, sdkEntry }: ProjectProgram,
  checker: ts.TypeChecker,
): SdkModule | undefined {
  const entry = program.getSourceFile(sdkEntry)
  if (entry === undefined) {
    return undefined
  }
  const symbol = checker.getSymbolAtLocation(entry)
  if (symbol === undefined) {
    return undefined
  }
  const exports = checker.getExportsOfModule(symbol)
  const functions = new Map<ts.Symbol, string>()
  for (const exported of exports) {
    const target = symbolToTarget(exported, checker)
    if (target.flags & ts.SymbolFlags.Function) {
      functions.set(target, exported.name)
    }
  }
  return { symbol, names: new Set(exports.map(({ name }) => name)), functions }
}

export function symbolToTarget(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
): ts.Symbol {
  if (symbol.flags & ts.SymbolFlags.Alias) {
    return checker.getAliasedSymbol(symbol)
  }
  return symbol
}

function identifierToSdkExportName(
  identifier: ts.Identifier,
  checker: ts.TypeChecker,
  sdkExports: ReadonlyMap<ts.Symbol, string>,
): string | undefined {
  const symbol = identifierToSymbol(identifier, checker)
  if (symbol === undefined) {
    return undefined
  }
  return sdkExports.get(symbolToTarget(symbol, checker))
}

function identifierToSymbol(
  identifier: ts.Identifier,
  checker: ts.TypeChecker,
): ts.Symbol | undefined {
  const parent = identifier.parent
  if (ts.isShorthandPropertyAssignment(parent)) {
    return checker.getShorthandAssignmentValueSymbol(parent)
  }
  if (
    ts.isBindingElement(parent) &&
    parent.propertyName === undefined &&
    ts.isObjectBindingPattern(parent.parent)
  ) {
    return checker.getTypeAtLocation(parent.parent).getProperty(identifier.text)
  }
  return checker.getSymbolAtLocation(identifier)
}

function identifierToExpression(
  identifier: ts.Identifier,
): ts.Identifier | ts.PropertyAccessExpression {
  const parent = identifier.parent
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
    return parent
  }
  return identifier
}

function expressionToCall(
  expression: ts.Expression,
): ts.CallExpression | undefined {
  const parent = expression.parent
  if (ts.isCallExpression(parent) && parent.expression === expression) {
    return parent
  }
  return undefined
}
