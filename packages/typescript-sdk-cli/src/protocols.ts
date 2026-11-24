import type { YAMLMap } from 'yaml'
import type {
  NamedSchema,
  SchemaNode,
  SourceLocation,
} from './model/contract.ts'
import type { Diagnostic } from './model/diagnostic.ts'
import type { Resource } from './model/protocols/rest/contract.ts'
import { resourcesToReferences } from './model/protocols/rest/resources-to-references.ts'
import { sideBlocksToMerged } from './model/protocols/rest/resources-to-merged.ts'
import type { TaggedComment } from './reader/comment-tags.ts'
import { restDecoratorTargets } from './reader/protocols/rest/handler-methods.ts'
import { protocolInputToResources } from './reader/protocols/rest/protocol-input-to-resources.ts'
import type { SchemaContext } from './reader/schema-context.ts'
import type { DecoratorTarget, SdkDecorator } from './reader/sdk-references.ts'
import { resourcesToYaml } from './writer/protocols/rest/resources-to-yaml.ts'

export type Contract = {
  provides: Map<string, unknown>
  consumes: Map<string, Map<string, unknown>>
  schemas: Array<NamedSchema>
}

export type SideBlock<TBlock> = {
  provider?: string
  block: TBlock
}

export type Reference = {
  schema: string
  location: SourceLocation
}

export type ProtocolInput = {
  decorators: Array<SdkDecorator>
  comments: Array<TaggedComment>
  context: SchemaContext
}

export type ProtocolRead<TBlock> = {
  blocks: Array<SideBlock<TBlock>>
  derived: Array<NamedSchema>
  errors: Array<Diagnostic>
}

export type MergedBlock<TBlock> = {
  block: TBlock
  errors: Array<Diagnostic>
}

export type OptionValue = string

export interface SchemaVocabulary {
  fieldDecorator: string
  fieldOptions: ReadonlyArray<string>
  toNode: (options: Record<string, OptionValue>, node: SchemaNode) => SchemaNode
  toYaml: (node: SchemaNode, map: YAMLMap) => void
  references: (node: SchemaNode) => Array<string>
}

export interface ProtocolModule<TBlock = any> {
  name: string
  exports: Record<string, DecoratorTarget>
  tagKeywords: ReadonlyArray<string>
  read: (input: ProtocolInput) => ProtocolRead<TBlock>
  merge: (blocks: Array<SideBlock<TBlock>>) => MergedBlock<TBlock>
  references: (block: TBlock) => Array<Reference>
  isEmpty: (block: TBlock) => boolean
  toYaml: (block: TBlock) => YAMLMap
  vocabulary?: SchemaVocabulary
}

const restProtocol: ProtocolModule<Array<Resource>> = {
  name: 'rest',
  exports: restDecoratorTargets,
  tagKeywords: ['request', 'response'],
  read: protocolInputToResources,
  merge: sideBlocksToMerged,
  references: resourcesToReferences,
  isEmpty: (resources) => resources.length === 0,
  toYaml: resourcesToYaml,
}

export const defaultProtocols: ReadonlyArray<ProtocolModule> = [restProtocol]
