import { declarationsToContract } from '../model/declarations-to-contract.ts'
import type { Diagnostic } from '../model/diagnostic.ts'
import type { Contract, ProtocolModule } from '../protocols.ts'
import { programToTaggedComments } from './comment-tags.ts'
import { programToSyntaxErrors, projectToProgram } from './program.ts'
import type { Project } from './program.ts'
import { sdkReferencesToSchemas } from './schema-classes.ts'
import { programToSchemaContext } from './schema-context.ts'
import { programToSdkReferences } from './sdk-references.ts'
import type { SdkDecorator, SdkReference } from './sdk-references.ts'
import { taggedCommentsToHandlerComments } from './tag-handlers.ts'
import { taggedCommentsToSchemaTags } from './tag-schemas.ts'

export type { Project } from './program.ts'

export type ReadResult = {
  contract: Contract
  errors: Array<Diagnostic>
  warnings: Array<Diagnostic>
}

export function projectToContract(
  project: Project,
  cwd: string,
  protocols: ReadonlyArray<ProtocolModule>,
): ReadResult {
  const contract: Contract = {
    provides: new Map(),
    consumes: new Map(),
    schemas: [],
  }
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
  const references = programToSdkReferences(projectProgram, protocols)
  const tagged = programToTaggedComments(projectProgram, protocols)
  const context = programToSchemaContext(projectProgram.program, cwd)
  const schemaTags = taggedCommentsToSchemaTags(
    tagged.comments,
    context,
    protocols,
  )
  const schemas = sdkReferencesToSchemas(
    references,
    schemaTags,
    context,
    protocols,
  )
  const decorators = references.filter(isProtocolDecorator)
  const handlers = taggedCommentsToHandlerComments(
    tagged.comments,
    decorators,
    protocols,
  )
  const reads = protocols.map((protocol) => ({
    name: protocol.name,
    read: protocol.read({
      decorators: decorators.filter(
        (decorator) => decorator.protocol === protocol.name,
      ),
      comments: handlers.comments.get(protocol.name) ?? [],
      context,
    }),
  }))
  const merged = declarationsToContract(
    {
      blocks: new Map(reads.map(({ name, read }) => [name, read.blocks])),
      schemas: [
        ...schemas.schemas,
        ...reads.flatMap(({ read }) => read.derived),
        ...handlers.schemas,
      ],
    },
    protocols,
  )
  return {
    contract: merged.contract,
    errors: [
      ...referencesToDiagnostics(references, 'unregistered'),
      ...new Set([
        ...schemas.errors,
        ...reads.flatMap(({ read }) => read.errors),
      ]),
      ...tagged.errors,
      ...schemaTags.errors,
      ...handlers.errors,
      ...merged.errors,
    ],
    warnings: [
      ...referencesToDiagnostics(references, 'misplaced'),
      ...schemas.warnings,
      ...tagged.warnings,
      ...schemaTags.warnings,
    ],
  }
}

function isProtocolDecorator(
  reference: SdkReference,
): reference is SdkDecorator {
  return reference.use === 'decorator' && reference.protocol !== undefined
}

function referencesToDiagnostics(
  references: Array<SdkReference>,
  use: 'misplaced' | 'unregistered',
): Array<Diagnostic> {
  return references.flatMap((reference) => {
    if (reference.use === 'decorator' || reference.use !== use) {
      return []
    }
    return [{ message: reference.message, location: reference.location }]
  })
}
