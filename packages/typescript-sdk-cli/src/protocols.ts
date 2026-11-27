import type { YAMLMap } from 'yaml'
import type {
  NamedSchema,
  PrimitiveType,
  SchemaNode,
  SourceLocation,
} from './model/contract.ts'
import type { Diagnostic } from './model/diagnostic.ts'
import { blockToReferences } from './model/protocols/graphql/block-to-references.ts'
import { sideBlocksToMerged as graphqlSideBlocksToMerged } from './model/protocols/graphql/blocks-to-merged.ts'
import type { GraphqlBlock } from './model/protocols/graphql/contract.ts'
import {
  fieldOptions,
  fieldOptionsToLeaf,
  fieldOptionsToNode,
  nodeToArgumentsSchemas,
  primitiveNames,
} from './model/protocols/graphql/field-extra.ts'
import type { Resource } from './model/protocols/rest/contract.ts'
import { resourcesToReferences } from './model/protocols/rest/resources-to-references.ts'
import { sideBlocksToMerged } from './model/protocols/rest/resources-to-merged.ts'
import type { TaggedComment } from './reader/comment-tags.ts'
import { graphqlDecoratorTargets } from './reader/protocols/graphql/decorators-to-blocks.ts'
import { protocolInputToBlocks } from './reader/protocols/graphql/protocol-input-to-blocks.ts'
import {
  restDecoratorTargets,
  restRenamedExports,
} from './reader/protocols/rest/handler-methods.ts'
import { protocolInputToResources } from './reader/protocols/rest/protocol-input-to-resources.ts'
import { restRenamedTags } from './reader/protocols/rest/tag-handlers.ts'
import type { SchemaContext } from './reader/schema-context.ts'
import type { DecoratorTarget, SdkDecorator } from './reader/sdk-references.ts'
import { blockToYaml } from './writer/protocols/graphql/block-to-yaml.ts'
import { fieldExtraToYaml } from './writer/protocols/graphql/field-extra-to-yaml.ts'
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
  label: string
  fieldDecorator: string
  fieldOptions: ReadonlyArray<string>
  primitiveNames?: ReadonlyMap<string, PrimitiveType>
  toLeaf?: (options: Record<string, OptionValue>) => SchemaNode | undefined
  toNode: (options: Record<string, OptionValue>, node: SchemaNode) => SchemaNode
  toYaml: (node: SchemaNode, map: YAMLMap) => void
  references: (node: SchemaNode) => Array<string>
}

export interface ProtocolModule<TBlock = any> {
  name: string
  exports: Record<string, DecoratorTarget>
  renamedExports?: Record<string, string>
  tagKeywords: ReadonlyArray<string>
  renamedTags?: Record<string, string>
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
  renamedExports: restRenamedExports,
  tagKeywords: ['request', 'response'],
  renamedTags: restRenamedTags,
  read: protocolInputToResources,
  merge: sideBlocksToMerged,
  references: resourcesToReferences,
  isEmpty: (resources) => resources.length === 0,
  toYaml: resourcesToYaml,
}

const graphqlProtocol: ProtocolModule<GraphqlBlock> = {
  name: 'graphql',
  exports: graphqlDecoratorTargets,
  tagKeywords: ['arguments', 'returns', 'graph'],
  read: protocolInputToBlocks,
  merge: graphqlSideBlocksToMerged,
  references: blockToReferences,
  isEmpty: (block) =>
    block.operations.length === 0 && block.graph === undefined,
  toYaml: blockToYaml,
  vocabulary: {
    label: 'GraphQL',
    fieldDecorator: 'BidirektGraphqlField',
    fieldOptions,
    primitiveNames,
    toLeaf: fieldOptionsToLeaf,
    toNode: fieldOptionsToNode,
    toYaml: fieldExtraToYaml,
    references: nodeToArgumentsSchemas,
  },
}

export const defaultProtocols: ReadonlyArray<ProtocolModule> = [
  restProtocol,
  graphqlProtocol,
]
