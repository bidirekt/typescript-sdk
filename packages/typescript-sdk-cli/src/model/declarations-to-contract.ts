import { isDeepStrictEqual } from 'node:util'
import type {
  Contract,
  ProtocolModule,
  Reference,
  SchemaVocabulary,
  SideBlock,
} from '../protocols.ts'
import type { NamedSchema, SchemaNode, SourceLocation } from './contract.ts'
import type { Diagnostic } from './diagnostic.ts'

export type Declarations = {
  blocks: Map<string, Array<SideBlock<unknown>>>
  schemas: Array<NamedSchema>
}

export type ContractResult = {
  contract: Contract
  errors: Array<Diagnostic>
}

export type ProtocolBlock = {
  protocol: ProtocolModule
  block: unknown
}

export function declarationsToContract(
  declarations: Declarations,
  protocols: ReadonlyArray<ProtocolModule>,
): ContractResult {
  const { schemas, errors } = declarationsToSchemas(declarations.schemas)
  const contract: Contract = {
    provides: new Map(),
    consumes: new Map(),
    schemas,
  }
  const mergeErrors: Array<Diagnostic> = []
  for (const protocol of protocols) {
    const sides = Map.groupBy(
      declarations.blocks.get(protocol.name) ?? [],
      ({ provider }) => provider,
    )
    for (const [provider, sideBlocks] of sides) {
      const merged = protocol.merge(sideBlocks)
      mergeErrors.push(...merged.errors)
      sideToBlocks(contract, provider).set(protocol.name, merged.block)
    }
  }
  const declared = new Set(declarations.schemas.map((schema) => schema.name))
  return {
    contract,
    errors: [
      ...errors,
      ...declarations.schemas.flatMap(schemaToDuplicateFields),
      ...mergeErrors,
      ...contractToMissingReferences(contract, protocols, declared),
    ],
  }
}

export function contractToProtocolBlocks(
  contract: Contract,
  protocols: ReadonlyArray<ProtocolModule>,
): Array<ProtocolBlock> {
  return [contract.provides, ...contract.consumes.values()].flatMap((blocks) =>
    protocols
      .filter((protocol) => blocks.has(protocol.name))
      .map((protocol) => ({ protocol, block: blocks.get(protocol.name) })),
  )
}

function sideToBlocks(
  contract: Contract,
  provider: string | undefined,
): Map<string, unknown> {
  if (provider === undefined) {
    return contract.provides
  }
  const blocks = contract.consumes.get(provider) ?? new Map<string, unknown>()
  contract.consumes.set(provider, blocks)
  return blocks
}

function declarationsToSchemas(declarations: Array<NamedSchema>): {
  schemas: Array<NamedSchema>
  errors: Array<Diagnostic>
} {
  const schemas: Array<NamedSchema> = []
  const errors: Array<Diagnostic> = []
  for (const [name, group] of Map.groupBy(
    declarations,
    (declaration) => declaration.name,
  )) {
    const [first] = group
    if (
      group.every((declaration) => isSameList(declaration.node, first.node))
    ) {
      schemas.push(first)
      continue
    }
    const message = collisionToMessage(name, group)
    for (const { location } of group) {
      errors.push({ message, location })
    }
  }
  return { schemas, errors }
}

function schemaToDuplicateFields(schema: NamedSchema): Array<Diagnostic> {
  if (schema.node.type !== 'object') {
    return []
  }
  const names = schema.node.properties.map(({ name }) => name)
  return schema.node.properties
    .filter(({ name }) => names.indexOf(name) !== names.lastIndexOf(name))
    .map(({ name, location }) => ({
      message: `field "${name}" is declared more than once in schema "${schema.name}": give each field a distinct name`,
      location,
    }))
}

function isSameList(node: SchemaNode, first: SchemaNode): boolean {
  if (node === first) {
    return true
  }
  return node.type === 'array' && isDeepStrictEqual(node, first)
}

function collisionToMessage(name: string, group: Array<NamedSchema>): string {
  const lists = group.filter(({ node }) => node.type === 'array')
  if (lists.length === 0) {
    return `schema name "${name}" is declared more than once: give each schema a distinct name`
  }
  if (lists.length === group.length) {
    return `lists named "${name}" differ: give each list a distinct name`
  }
  return `list name "${name}" is also the name of another schema: give the list a distinct name`
}

function contractToMissingReferences(
  contract: Contract,
  protocols: ReadonlyArray<ProtocolModule>,
  declared: ReadonlySet<string>,
): Array<Diagnostic> {
  const vocabularies = protocols.flatMap(({ vocabulary }) => vocabulary ?? [])
  const references: Array<Reference> = [
    ...contractToProtocolBlocks(contract, protocols).flatMap(
      ({ protocol, block }) => protocol.references(block),
    ),
    ...contract.schemas.flatMap((schema) =>
      nodeToReferences(schema.node, schema.location, vocabularies),
    ),
  ]
  return references
    .filter(({ schema }) => !declared.has(schema))
    .map(({ schema, location }) => ({
      message: `schema "${schema}" is not declared: reference a schema by its name in the contract`,
      location,
    }))
}

function nodeToReferences(
  node: SchemaNode,
  location: SourceLocation,
  vocabularies: ReadonlyArray<SchemaVocabulary>,
): Array<Reference> {
  return [
    ...extraToReferences(node, location, vocabularies),
    ...typeToReferences(node, location, vocabularies),
  ]
}

function extraToReferences(
  node: SchemaNode,
  location: SourceLocation,
  vocabularies: ReadonlyArray<SchemaVocabulary>,
): Array<Reference> {
  if (node.extra === undefined) {
    return []
  }
  return vocabularies
    .flatMap((vocabulary) => vocabulary.references(node))
    .map((schema) => ({ schema, location }))
}

function typeToReferences(
  node: SchemaNode,
  location: SourceLocation,
  vocabularies: ReadonlyArray<SchemaVocabulary>,
): Array<Reference> {
  switch (node.type) {
    case 'ref':
      return [{ schema: node.schema, location }]
    case 'object':
      return node.properties.flatMap((property) =>
        nodeToReferences(property.node, property.location, vocabularies),
      )
    case 'array':
      return nodeToReferences(node.items, location, vocabularies)
    case 'map':
      return nodeToReferences(node.values, location, vocabularies)
    case 'union':
      return node.members.flatMap((member) =>
        nodeToReferences(member.node, location, vocabularies),
      )
  }
  return []
}
