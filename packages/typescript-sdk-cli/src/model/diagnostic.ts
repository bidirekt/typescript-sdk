import type { SourceLocation } from './contract.ts'

export type Diagnostic = {
  message: string
  location?: SourceLocation
}

export function isDiagnostic(value: unknown): value is Diagnostic {
  return typeof value === 'object' && value !== null && 'message' in value
}
