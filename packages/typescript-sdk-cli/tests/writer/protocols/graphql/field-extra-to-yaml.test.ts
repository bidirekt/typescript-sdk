import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Document, Pair, YAMLMap } from 'yaml'
import {
  fieldOptionsToNode,
  scalarToNode,
} from '../../../../src/model/protocols/graphql/field-extra.ts'
import { fieldExtraToYaml } from '../../../../src/writer/protocols/graphql/field-extra-to-yaml.ts'

describe('fieldExtraToYaml', () => {
  it('writes a scalar in place of the type, with its name', () => {
    const map = new YAMLMap()
    map.add(new Pair('type', 'string'))
    fieldExtraToYaml(scalarToNode('DateTime'), map)
    assert.equal(new Document(map).toString(), 'type: scalar\nname: DateTime\n')
  })

  it('writes the arguments after the keys already written', () => {
    const map = new YAMLMap()
    map.add(new Pair('ref', 'Review'))
    fieldExtraToYaml(
      fieldOptionsToNode(
        { arguments: 'ReviewsArgs' },
        { type: 'ref', schema: 'Review' },
      ),
      map,
    )
    assert.equal(
      new Document(map).toString(),
      'ref: Review\narguments: ReviewsArgs\n',
    )
  })

  it('writes nothing for the extra of other vocabularies', () => {
    const map = new YAMLMap()
    fieldExtraToYaml({ type: 'string', extra: { other: 'kept' } }, map)
    assert.equal(new Document(map).toString(), '{}\n')
  })
})
