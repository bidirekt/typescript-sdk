import ts from 'typescript'
import type { SourceLocation } from '../model/contract.ts'
import type { ProtocolModule } from '../protocols.ts'
import { nodeToLocation } from './location.ts'
import { programToUserFiles } from './program.ts'
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
      use: 'misplaced' | 'unregistered'
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

const coreTargets: Record<string, DecoratorTarget> = {
  BidirektSchema: {
    isTarget: ts.isClassDeclaration,
    description: 'a class declaration',
  },
  BidirektField: {
    isTarget: (node) => ts.isPropertyDeclaration(node) && !isStatic(node),
    description: 'a property',
  },
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
  const sdkExports = programToSdkExports(projectProgram, checker)
  const found: Array<FoundReference> = []
  if (sdkExports.size === 0) {
    return []
  }
  const pending: Array<ts.Node> = programToUserFiles(projectProgram)
    .filter((file) => !file.isDeclarationFile)
    .reverse()
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
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
      const name = identifierToSdkExportName(node, checker, sdkExports)
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
  return foundToSdkReferences(found, targets)
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

function programToSdkExports(
  { program, sdkEntry }: ProjectProgram,
  checker: ts.TypeChecker,
): Map<ts.Symbol, string> {
  const sdkExports = new Map<ts.Symbol, string>()
  const entry = program.getSourceFile(sdkEntry)
  if (entry === undefined) {
    return sdkExports
  }
  const entryModule = checker.getSymbolAtLocation(entry)
  if (entryModule === undefined) {
    return sdkExports
  }
  for (const exported of checker.getExportsOfModule(entryModule)) {
    const target = symbolToTarget(exported, checker)
    if (target.flags & ts.SymbolFlags.Function) {
      sdkExports.set(target, exported.name)
    }
  }
  return sdkExports
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
  sdkExports: Map<ts.Symbol, string>,
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
