import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  SourceLocation,
  UnionMember,
} from '../../../../src/model/contract.ts'
import type { ReturnedType } from '../../../../src/model/protocols/graphql/contract.ts'
import { returnsToSchema } from '../../../../src/model/protocols/graphql/returns-to-schema.ts'

const at: SourceLocation = { file: 'src/clients.ts', line: 4 }

const pet: ReturnedType = { kind: 'schema', schema: 'Pet' }

const scalarNode = {
  type: 'string',
  extra: { scalar: 'DateTime' },
}

const searchMembers: Array<UnionMember> = [
  { key: 'Pet', node: { type: 'ref', schema: 'Pet' } },
  { key: 'Owner', node: { type: 'ref', schema: 'Owner' } },
]

describe('returnsToSchema', () => {
  it('returns a schema by its own name, without a derived schema', () => {
    assert.deepEqual(returnsToSchema({ form: 'type', type: pet }, at), {
      schema: 'Pet',
      derived: [],
    })
  })

  it('derives a nullable schema named after the type', () => {
    assert.deepEqual(returnsToSchema({ form: 'nullable', type: pet }, at), {
      schema: 'PetOrNull',
      derived: [
        {
          name: 'PetOrNull',
          node: { type: 'ref', schema: 'Pet', nullable: true },
          location: at,
          derived: true,
        },
      ],
    })
  })

  for (const { nullable, nullableItems, name, node } of [
    {
      nullable: false,
      nullableItems: false,
      name: 'PetList',
      node: { type: 'array', items: { type: 'ref', schema: 'Pet' } },
    },
    {
      nullable: true,
      nullableItems: false,
      name: 'PetListOrNull',
      node: {
        type: 'array',
        items: { type: 'ref', schema: 'Pet' },
        nullable: true,
      },
    },
    {
      nullable: false,
      nullableItems: true,
      name: 'PetOrNullList',
      node: {
        type: 'array',
        items: { type: 'ref', schema: 'Pet', nullable: true },
      },
    },
    {
      nullable: true,
      nullableItems: true,
      name: 'PetOrNullListOrNull',
      node: {
        type: 'array',
        items: { type: 'ref', schema: 'Pet', nullable: true },
        nullable: true,
      },
    },
  ]) {
    it(`derives the list ${name}`, () => {
      assert.deepEqual(
        returnsToSchema(
          { form: 'list', type: pet, nullable, nullableItems },
          at,
        ),
        {
          schema: name,
          derived: [{ name, node, location: at, derived: true }],
        },
      )
    })
  }

  it('uses the declared name of a list or a nullable schema', () => {
    assert.equal(
      returnsToSchema(
        {
          form: 'list',
          type: pet,
          nullable: false,
          nullableItems: false,
          name: 'Pets',
        },
        at,
      ).schema,
      'Pets',
    )
    assert.equal(
      returnsToSchema({ form: 'nullable', type: pet, name: 'MaybePet' }, at)
        .schema,
      'MaybePet',
    )
  })

  it('derives a schema for a primitive and a scalar, named after each', () => {
    const returned: Array<ReturnedType> = [
      { kind: 'primitive', type: 'boolean' },
      { kind: 'scalar', scalar: 'DateTime' },
      { kind: 'scalar', scalar: 'DateTime', name: 'Instant' },
    ]
    assert.deepEqual(
      returned.map((type) => returnsToSchema({ form: 'type', type }, at)),
      [
        {
          schema: 'Boolean',
          derived: [
            {
              name: 'Boolean',
              node: { type: 'boolean' },
              location: at,
              derived: true,
            },
          ],
        },
        {
          schema: 'DateTime',
          derived: [
            {
              name: 'DateTime',
              node: scalarNode,
              location: at,
              derived: true,
            },
          ],
        },
        {
          schema: 'Instant',
          derived: [
            {
              name: 'Instant',
              node: scalarNode,
              location: at,
              derived: true,
            },
          ],
        },
      ],
    )
  })

  it('writes a declared enum as its own schema and reads it by name when nullable or in a list', () => {
    const status: ReturnedType = {
      kind: 'schema',
      schema: 'Status',
      declared: { type: 'enum', members: ['AVAILABLE', 'SOLD'] },
    }
    const declared = {
      name: 'Status',
      node: { type: 'enum', members: ['AVAILABLE', 'SOLD'] },
      location: at,
      derived: true,
    }
    assert.deepEqual(
      [
        returnsToSchema({ form: 'type', type: status }, at),
        returnsToSchema({ form: 'nullable', type: status }, at),
        returnsToSchema(
          {
            form: 'list',
            type: status,
            nullable: true,
            nullableItems: true,
          },
          at,
        ),
      ],
      [
        { schema: 'Status', derived: [declared] },
        {
          schema: 'StatusOrNull',
          derived: [
            declared,
            {
              name: 'StatusOrNull',
              node: { type: 'ref', schema: 'Status', nullable: true },
              location: at,
              derived: true,
            },
          ],
        },
        {
          schema: 'StatusOrNullListOrNull',
          derived: [
            declared,
            {
              name: 'StatusOrNullListOrNull',
              node: {
                type: 'array',
                items: { type: 'ref', schema: 'Status', nullable: true },
                nullable: true,
              },
              location: at,
              derived: true,
            },
          ],
        },
      ],
    )
  })

  it('writes a declared union as its own schema and reads it by name in a list with its own name', () => {
    const searchResult: ReturnedType = {
      kind: 'schema',
      schema: 'SearchResult',
      declared: { type: 'union', members: searchMembers },
    }
    assert.deepEqual(
      returnsToSchema(
        {
          form: 'list',
          type: searchResult,
          nullable: false,
          nullableItems: false,
          name: 'Results',
        },
        at,
      ),
      {
        schema: 'Results',
        derived: [
          {
            name: 'SearchResult',
            node: { type: 'union', members: searchMembers },
            location: at,
            derived: true,
          },
          {
            name: 'Results',
            node: {
              type: 'array',
              items: { type: 'ref', schema: 'SearchResult' },
            },
            location: at,
            derived: true,
          },
        ],
      },
    )
  })

  it('names the lists and nullable schemas of a primitive and a scalar after them', () => {
    assert.deepEqual(
      [
        returnsToSchema(
          {
            form: 'list',
            type: { kind: 'primitive', type: 'string' },
            nullable: false,
            nullableItems: false,
          },
          at,
        ),
        returnsToSchema(
          { form: 'nullable', type: { kind: 'primitive', type: 'integer' } },
          at,
        ),
        returnsToSchema(
          {
            form: 'list',
            type: { kind: 'scalar', scalar: 'DateTime' },
            nullable: false,
            nullableItems: true,
          },
          at,
        ),
      ].flatMap(({ derived }) => derived.map(({ name, node }) => [name, node])),
      [
        ['StringList', { type: 'array', items: { type: 'string' } }],
        ['IntegerOrNull', { type: 'integer', nullable: true }],
        [
          'DateTimeOrNullList',
          { type: 'array', items: { ...scalarNode, nullable: true } },
        ],
      ],
    )
  })
})
