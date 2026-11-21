import type { SourceLocation } from './contract.ts'
import type { Diagnostic } from './diagnostic.ts'

const descriptionPattern = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/

export function descriptionToDiagnostic(
  description: string,
  location: SourceLocation,
): Diagnostic | undefined {
  if (description === '') {
    return {
      message:
        '"description" is empty: write a description or leave "description" out',
      location,
    }
  }
  if (descriptionPattern.test(description)) {
    return undefined
  }
  return {
    message: `description ${JSON.stringify(description)} must be ASCII letters and digits, with single spaces between words: remove or replace the other characters`,
    location,
  }
}
