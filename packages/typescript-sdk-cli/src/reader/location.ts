import { posix, relative, sep } from 'node:path'
import type ts from 'typescript'
import type { SourceLocation } from '../model/contract.ts'

export function nodeToLocation(node: ts.Node): SourceLocation {
  const file = node.getSourceFile()
  const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
  return { file: file.fileName, line: line + 1 }
}

export function pathToShown(path: string, cwd: string): string {
  return relative(cwd, path).split(sep).join(posix.sep)
}
