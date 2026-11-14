import type { Contract } from '../model/contract.ts'
import { declarationsToContract } from '../model/declarations-to-contract.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import { programToTaggedComments } from './comment-tags.ts'
import { sdkReferencesToResources } from './handler-methods.ts'
import { programToSyntaxErrors, projectToProgram } from './program.ts'
import type { Project } from './program.ts'
import { sdkReferencesToSchemas } from './schema-classes.ts'
import { programToSchemaContext } from './schema-context.ts'
import { programToSdkReferences } from './sdk-references.ts'
import { taggedCommentsToResources } from './tag-handlers.ts'
import { taggedCommentsToEnumSchemas } from './tag-schemas.ts'

export type { Project } from './program.ts'

export type ReadResult = {
  contract: Contract
  errors: Array<Diagnostic>
  warnings: Array<Diagnostic>
}

export function projectToContract(project: Project, cwd: string): ReadResult {
  const contract: Contract = { provides: [], consumes: [], schemas: [] }
  const projectProgram = projectToProgram(project)
  if ('message' in projectProgram) {
    return {
      contract,
      errors: [projectProgram],
      warnings: [],
    }
  }
  const syntaxErrors = programToSyntaxErrors(projectProgram)
  if (syntaxErrors.length > 0) {
    return { contract, errors: syntaxErrors, warnings: [] }
  }
  const references = programToSdkReferences(projectProgram)
  const tagged = programToTaggedComments(projectProgram)
  const context = programToSchemaContext(projectProgram.program, cwd)
  const enumSchemas = taggedCommentsToEnumSchemas(tagged.comments, context)
  const schemas = sdkReferencesToSchemas(references, context)
  const resources = sdkReferencesToResources(references, context)
  const tagResources = taggedCommentsToResources(tagged.comments, references)
  const merged = declarationsToContract({
    provides: [...resources.provides, ...tagResources.provides],
    consumes: [...resources.consumes, ...tagResources.consumes],
    schemas: [
      ...schemas.schemas,
      ...resources.schemas,
      ...tagResources.schemas,
    ],
  })
  return {
    contract: merged.contract,
    errors: [
      ...new Set([...schemas.errors, ...resources.errors]),
      ...tagged.errors,
      ...enumSchemas.errors,
      ...tagResources.errors,
      ...merged.errors,
    ],
    warnings: [
      ...references.flatMap((reference) => {
        if (reference.use !== 'misplaced') {
          return []
        }
        return [{ message: reference.message, location: reference.location }]
      }),
      ...schemas.warnings,
      ...tagged.warnings,
      ...enumSchemas.warnings,
    ],
  }
}
