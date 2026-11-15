import { isDeepStrictEqual } from 'node:util'
import type {
  Body,
  Contract,
  NamedSchema,
  SchemaNode,
  SourceLocation,
} from './contract.ts'
import type { Diagnostic } from './diagnostic.ts'
import { consumedToMerged, providedToMerged } from './resources-to-merged.ts'

export type ContractResult = {
  contract: Contract
  errors: Array<Diagnostic>
}

type Reference = {
  schema: string
  location: SourceLocation
}

export function declarationsToContract(declarations: Contract): ContractResult {
  const { schemas, errors } = declarationsToSchemas(declarations.schemas)
  const provides = providedToMerged(declarations.provides)
  const consumes = consumedToMerged(declarations.consumes)
  const contract = {
    provides: provides.resources,
    consumes: consumes.resources,
    schemas,
  }
  const declared = new Set(declarations.schemas.map((schema) => schema.name))
  return {
    contract,
    errors: [
      ...errors,
      ...declarations.schemas.flatMap(schemaToDuplicateFields),
      ...provides.errors,
      ...consumes.errors,
      ...contractToMissingReferences(contract, declared),
    ],
  }
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
  declared: ReadonlySet<string>,
): Array<Diagnostic> {
  const bodies: Array<Body> = [...contract.provides, ...contract.consumes]
    .flatMap((resource) => [resource.request, ...resource.responses])
    .filter((body) => body !== undefined)
  const references: Array<Reference> = [
    ...bodies.flatMap(({ schema, location }) => {
      if (schema === null) {
        return []
      }
      return [{ schema, location }]
    }),
    ...contract.schemas.flatMap((schema) =>
      nodeToReferences(schema.node, schema.location),
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
): Array<Reference> {
  switch (node.type) {
    case 'ref':
      return [{ schema: node.schema, location }]
    case 'object':
      return node.properties.flatMap((property) =>
        nodeToReferences(property.node, property.location),
      )
    case 'array':
      return nodeToReferences(node.items, location)
    case 'map':
      return nodeToReferences(node.values, location)
    case 'union':
      return node.members.flatMap((member) =>
        nodeToReferences(member.node, location),
      )
  }
  return []
}
