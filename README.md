# Bidirekt TypeScript SDK

[![CI](https://img.shields.io/github/actions/workflow/status/bidirekt/typescript-sdk/ci.yml?branch=main&label=CI)](https://github.com/bidirekt/typescript-sdk/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/bidirekt/typescript-sdk)](LICENSE)

In Bidirekt, each side of an integration declares in a contract file what it provides and what it consumes. This SDK writes that file from TypeScript and JavaScript code: you annotate the schemas and the handlers that provide or consume each resource, run `generate`, and get `contracts/generated.yaml`, ready for `bidirekt validate` and `bidirekt publish`. It comes in two packages: `@bidirekt/typescript-sdk`, the decorators your code imports, and `@bidirekt/typescript-sdk-cli`, the `generate` command.

`contracts/generated.yaml` is the service's only contract file: once a service adopts the SDK, every resource and schema it provides or consumes is annotated in its code.

## Installation

Both packages need Node.js 22.12 or later. Install the `generate` command as a dev dependency:

```sh
npm install --save-dev @bidirekt/typescript-sdk-cli
```

With decorators, your app imports them at runtime, so install them as a regular dependency too (they have no dependencies of their own). With tags only, the command is all you need.

```sh
npm install @bidirekt/typescript-sdk
```

Their types need TypeScript 5.0 or later.

## Quickstart

There are two ways to annotate, and each covers schemas, the resources a service provides and the ones it consumes: decorators, for code with classes, or `@bidirekt` tags in `/** */` comments, for function handlers and plain JavaScript. Both examples below write the same contract.

A field without an annotation stays out of the contract. Its type comes from TypeScript; declare `type` when TypeScript can't say it: a primitive (`string`, `integer`, `float`, `number`, `boolean`), `T[]` or `map<T>`, nested up to three levels in a decorator and to any depth in a tag (`integer[][]`, `map<float[]>`).

### With decorators

Mark each schema with `@BidirektSchema` and each field of the contract with `@BidirektField`:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ type: 'integer' })
  id!: number

  @BidirektField()
  name!: string

  @BidirektField()
  birthDate!: string | null

  internalNotes!: string
}

@BidirektSchema()
export class NewPet {
  @BidirektField()
  name!: string
}
```

```ts
// charge.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class NewCharge {
  @BidirektField({ type: 'integer' })
  amount!: number
}

@BidirektSchema()
export class Charge {
  @BidirektField()
  id!: string
}
```

Declare what a controller provides with `@BidirektProvider` on its methods (NestJS, for example). A body is a schema class, `null` for no body, `[Pet]` for a list (named `PetList`), or `{ list: Pet, name: 'PetCollection' }` for a list with its own name:

```ts
// pets.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { BidirektProvider } from '@bidirekt/typescript-sdk'
import { NewPet, Pet } from './pet.js'

const pets: Array<Pet> = []

@Controller('pets')
export class PetsController {
  @Get()
  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list(): Array<Pet> {
    return pets
  }

  @Get(':id')
  @BidirektProvider({
    method: 'GET',
    path: '/pets/*',
    responses: { 200: Pet, 404: null },
  })
  find(@Param('id') id: string): Pet {
    const pet = pets.find((candidate) => candidate.id === Number(id))
    if (pet === undefined) {
      throw new NotFoundException()
    }
    return pet
  }

  @Post()
  @BidirektProvider({
    method: 'POST',
    path: '/pets',
    request: NewPet,
    responses: { 201: Pet, 400: null },
  })
  create(@Body() body: NewPet | undefined): Pet {
    if (typeof body?.name !== 'string') {
      throw new BadRequestException()
    }
    const pet = new Pet()
    pet.id = pets.length + 1
    pet.name = body.name
    pet.birthDate = null
    pets.push(pet)
    return pet
  }
}
```

And what a client consumes with `@BidirektConsumer`:

```ts
// payments.client.ts
import { BidirektConsumer } from '@bidirekt/typescript-sdk'
import { Charge, NewCharge } from './charge.js'

export class PaymentsClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge, 402: null },
  })
  async charge(body: NewCharge): Promise<Charge> {
    const response = await fetch('http://payments/charges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (response.status === 402) {
      throw new Error('payment required')
    }
    return (await response.json()) as Charge
  }
}
```

With `emitDecoratorMetadata` on (NestJS, TypeORM), TypeScript keeps the imports of decorated classes at runtime, so classes that reference each other can fail at startup with `Cannot access 'Pet' before initialization`, and each decorated field emits its type as metadata that other libraries act on (class-transformer's implicit conversion, for example, turns `'10'` into `10`). Annotate such classes with tags instead.

### With tags

Mark each schema with `@bidirekt schema` above an `interface` (or an object `type`) and each field of the contract with `@bidirekt field`; a field outside a schema is not read, and `generate` warns about it. `field` takes `type=`, `name=`, `optional=`, `nullable=`, `description="..."` and `union=`, which keys the members of a union of schemas, also in a list or map (`union={card: Card, pix: Pix}` on `Array<Card | Pix>`). Arguments are separated by spaces; only a `description` value can be quoted to hold spaces, and only a `union=` value grouped in `{...}`:

```ts
// schemas.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field type=integer */
  id: number

  /** @bidirekt field */
  name: string

  /** @bidirekt field */
  birthDate: string | null

  internalNotes: string
}

/** @bidirekt schema */
export interface NewPet {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface NewCharge {
  /** @bidirekt field type=integer */
  amount: number
}

/** @bidirekt schema */
export interface Charge {
  /** @bidirekt field */
  id: string
}
```

In plain JavaScript, a schema is a class with the same tags, and a field's type comes from its JSDoc `@type` or from `type=`, never from its initial value, see [JavaScript](#javascript).

Declare what a function handler provides with `@bidirekt provides <METHOD> <path>` in the comment above it (Express, for example), then its `@bidirekt request [schema]` and each `@bidirekt response <status> [schema]`. A tag names a schema by its name in the contract; `Pet[]` is a list (named `PetList`) and `Pet[] as PetCollection` a list with its own name:

```ts
// pets.ts
import express from 'express'
import type { NewPet, Pet } from './schemas.ts'

const pets: Array<Pet> = []

export const router = express.Router()

/**
 * @bidirekt provides GET /pets
 * @bidirekt response 200 Pet[]
 */
router.get('/pets', (_req, res) => {
  res.json(pets)
})

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 * @bidirekt response 404
 */
router.get('/pets/:id', (req, res) => {
  const pet = pets.find((candidate) => candidate.id === Number(req.params.id))
  if (pet === undefined) {
    res.sendStatus(404)
    return
  }
  res.json(pet)
})

/**
 * @bidirekt provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 Pet
 * @bidirekt response 400
 */
router.post('/pets', (req, res) => {
  const body = req.body as NewPet | undefined
  if (typeof body?.name !== 'string') {
    res.sendStatus(400)
    return
  }
  const pet: Pet = {
    id: pets.length + 1,
    name: body.name,
    birthDate: null,
    internalNotes: '',
  }
  pets.push(pet)
  res.status(201).json(pet)
})
```

And what a function consumes with `@bidirekt consumes <provider> <METHOD> <path>`:

```ts
// payments.ts
import type { Charge, NewCharge } from './schemas.ts'

/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt request NewCharge
 * @bidirekt response 201 Charge
 * @bidirekt response 402
 */
export async function createCharge(body: NewCharge): Promise<Charge> {
  const response = await fetch('http://payments/charges', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (response.status === 402) {
    throw new Error('payment required')
  }
  return (await response.json()) as Charge
}
```

### Generate the contract

Run `generate` in the project folder:

```sh
npx @bidirekt/typescript-sdk-cli generate
```

Either example writes the same `contracts/generated.yaml`:

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets:
      get:
        responses:
          200: PetList
      post:
        request: NewPet
        responses:
          201: Pet
          400: ~
    /pets/*:
      get:
        responses:
          200: Pet
          404: ~
consumes:
  payments_api:
    rest:
      /charges:
        post:
          request: NewCharge
          responses:
            201: Charge
            402: ~
schemas:
  Charge:
    type: object
    properties:
      id:
        type: string
  NewCharge:
    type: object
    properties:
      amount:
        type: integer
  NewPet:
    type: object
    properties:
      name:
        type: string
  Pet:
    type: object
    properties:
      id:
        type: integer
      name:
        type: string
      birthDate:
        type: string
        nullable: true
  PetList:
    type: array
    items:
      ref: Pet
```

### Schemas in a handler's comment

A handler that builds its body by hand, with no type to read, declares the schema in its own comment: `@bidirekt schema <Name>` opens a schema and each following `@bidirekt field <name> type=...` is a field of it, until the next `schema` or the end of the comment. `type=` is required there, and in any tag it also takes a schema name, alone or in a list or map (`HealthCheck`, `HealthCheck[]`, `map<HealthCheck>`). These schemas belong to the whole contract, so other handlers and fields reference them by name:

```ts
// health.ts
import express from 'express'

export const router = express.Router()

/**
 * @bidirekt provides GET /health
 * @bidirekt response 200 Health
 *
 * @bidirekt schema Health
 * @bidirekt field status type=string
 * @bidirekt field uptime type=integer
 * @bidirekt field checks type=HealthCheck[]
 *
 * @bidirekt schema HealthCheck
 * @bidirekt field name type=string
 * @bidirekt field ok type=boolean
 * @bidirekt field error type=string nullable=true
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    checks: [{ name: 'database', ok: true, error: null }],
  })
})
```

`generate` writes:

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /health:
      get:
        responses:
          200: Health
schemas:
  Health:
    type: object
    properties:
      status:
        type: string
      uptime:
        type: integer
      checks:
        type: array
        items:
          ref: HealthCheck
  HealthCheck:
    type: object
    properties:
      name:
        type: string
      ok:
        type: boolean
      error:
        type: string
        nullable: true
```

A schema there with no field stops `generate`:

```ts
// health.ts
/**
 * @bidirekt provides GET /health
 * @bidirekt response 200 Health
 *
 * @bidirekt schema Health
 */
export function health() {}
```

```text
health.ts:6 schema "Health" has no field: annotate at least one field with "@bidirekt field"
```

## Reference

Every example below is a whole project: `generate` run on it alone writes the YAML shown, or prints the lines shown and exits with 1. Where a feature has both forms, the decorator example and the tag example write the same YAML. The TypeScript examples compile with `strict` and `experimentalDecorators`, except the one that shows a syntax error.

`generate` recognizes a decorator by where it is imported from, `@bidirekt/typescript-sdk`, also through an alias, `import * as` or a re-export in your own code, never by its name. A decorator built at runtime (returned by a wrapper function, applied in a loop) is not read, and `generate` warns about it.

### Fields

`@BidirektField({ ... })` and `@bidirekt field key=value ...` take the same options:

| Decorator                                       | Tag                                          | What it declares                                                                 |
| ----------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| `type: 'integer'`                               | `type=integer`                               | the whole type of the field, see [Declared types](#declared-types)               |
| `name: 'birth_date'`                            | `name=birth_date`                            | the field's name in the contract; without it, the property's name                |
| `optional: true`                                | `optional=true`                              | whether the field can be absent; without it, from `?` or `undefined` in the type |
| `nullable: true`                                | `nullable=true`                              | whether the field can be `null`; without it, from `null` in the type             |
| `description: 'Shown on the card'`              | `description="Shown on the card"`            | the field's description; only a declared one, a plain comment is not             |
| `union: { card: CardPayment, pix: PixPayment }` | `union={card: CardPayment, pix: PixPayment}` | the key of each member of a union of schemas, see [Unions](#unions)              |

Decorator options are written in place: an object literal of string literals, `true`, `false` and, in `union`, classes, never a variable. Tag arguments are separated by spaces, and only a `description` value is quoted. A property without an annotation stays out of the contract.

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ name: 'birth_date', description: 'Day the pet was born' })
  birthDate!: string

  @BidirektField({ optional: true, nullable: true })
  nickname!: string

  @BidirektField({ optional: false, nullable: false })
  breed?: string | null

  internalNotes!: string
}
```

```ts
// pet.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field name=birth_date description="Day the pet was born" */
  birthDate: string

  /** @bidirekt field optional=true nullable=true */
  nickname: string

  /** @bidirekt field optional=false nullable=false */
  breed?: string | null

  internalNotes: string
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      birth_date:
        type: string
        description: Day the pet was born
      nickname:
        type: string
        optional: true
        nullable: true
      breed:
        type: string
```

A `static` property is not a field: an annotation on it is not read, and `generate` warns:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string

  @BidirektField()
  static species = 'dog'
}

/** @bidirekt schema */
export class Toy {
  /** @bidirekt field */
  name!: string

  /** @bidirekt field */
  static brand = 'acme'
}
```

```text
pet.ts:9 warning: @BidirektField is on a static property, so it is not read: put it on a property
pet.ts:18 warning: "@bidirekt field" is above a static property, so it is not read: put it above a property
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      name:
        type: string
  Toy:
    type: object
    properties:
      name:
        type: string
```

### Types

A field's type comes from TypeScript, or from the JSDoc `@type` in JavaScript:

| TypeScript                                                                     | Contract                                                  |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `string`, `boolean`, `number`                                                  | `string`, `boolean`, `number`                             |
| `T \| null`                                                                    | `nullable: true`                                          |
| `x?: T`, `T \| undefined`                                                      | `optional: true`                                          |
| `'a' \| 'b'`, through aliases too, `Status \| 'unknown'`, `(typeof X)[number]` | `type: enum`, inline                                      |
| a string `enum`                                                                | `ref` to an `enum` schema named after it, with its values |
| one member of a string `enum`, `PetStatus.Available`                           | `type: enum`, inline, with that member                    |
| a numeric `enum`                                                               | `integer`                                                 |
| `T[]`, `Array<T>`, `readonly T[]`                                              | `type: array`                                             |
| `Record<string, T>`, `{ [key: string]: T }`                                    | `type: map`                                               |
| `(T \| null)[]`, `Record<string, T \| null>`                                   | `nullable: true` on the items or values                   |
| a schema: class, interface or object type                                      | `ref`                                                     |
| a union of schemas                                                             | `type: union`, with the keys from `union`                 |

`integer` and `float` come only from a [declared type](#declared-types). A string enum or a literal union imported from a dependency translates the same way.

A type alias is followed to its type, a generic one too, while a generic class stops `generate`, see [Types `generate` can't translate](#types-generate-cant-translate):

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Nullable<T> = T | null

@BidirektSchema()
export class Pet {
  @BidirektField()
  nickname!: Nullable<string>
}
```

```ts
// pet.ts
type Nullable<T> = T | null

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  nickname: Nullable<string>
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      nickname:
        type: string
        nullable: true
```

#### Primitives, `null` and `undefined`

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string

  @BidirektField()
  vaccinated!: boolean

  @BidirektField()
  weight!: number

  @BidirektField()
  birthDate!: string | null

  @BidirektField()
  nickname?: string

  @BidirektField()
  breed!: string | undefined

  @BidirektField()
  color?: string | null
}
```

```ts
// pet.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string

  /** @bidirekt field */
  vaccinated: boolean

  /** @bidirekt field */
  weight: number

  /** @bidirekt field */
  birthDate: string | null

  /** @bidirekt field */
  nickname?: string

  /** @bidirekt field */
  breed: string | undefined

  /** @bidirekt field */
  color?: string | null
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      name:
        type: string
      vaccinated:
        type: boolean
      weight:
        type: number
      birthDate:
        type: string
        nullable: true
      nickname:
        type: string
        optional: true
      breed:
        type: string
        optional: true
      color:
        type: string
        optional: true
        nullable: true
```

#### Enums

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum PetStatus {
  Available = 'available',
  OnHold = 'on_hold',
}

export enum Priority {
  Low,
  High,
}

const SIZES = ['small', 'large'] as const

type Color = 'black' | 'white'

@BidirektSchema()
export class Pet {
  @BidirektField()
  status!: PetStatus

  @BidirektField()
  reportedStatus!: PetStatus | 'unknown'

  @BidirektField()
  initialStatus!: PetStatus.Available

  @BidirektField()
  size!: (typeof SIZES)[number]

  @BidirektField()
  color!: Color | null

  @BidirektField()
  priority!: Priority
}
```

```ts
// pet.ts
export enum PetStatus {
  Available = 'available',
  OnHold = 'on_hold',
}

export enum Priority {
  Low,
  High,
}

const SIZES = ['small', 'large'] as const

type Color = 'black' | 'white'

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  status: PetStatus

  /** @bidirekt field */
  reportedStatus: PetStatus | 'unknown'

  /** @bidirekt field */
  initialStatus: PetStatus.Available

  /** @bidirekt field */
  size: (typeof SIZES)[number]

  /** @bidirekt field */
  color: Color | null

  /** @bidirekt field */
  priority: Priority
}
```

<!-- prettier-ignore -->
```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      status:
        ref: PetStatus
      reportedStatus:
        type: enum
        members: ["available", "on_hold", "unknown"]
      initialStatus:
        type: enum
        members: ["available"]
      size:
        type: enum
        members: ["small", "large"]
      color:
        type: enum
        members: ["black", "white"]
        nullable: true
      priority:
        type: integer
  PetStatus:
    type: enum
    members: ["available", "on_hold"]
```

To name an enum's schema, or to write it without a field that uses it, see [Enums](#enums-1) under Schemas.

#### Lists, maps and references

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Owner {
  @BidirektField()
  name!: string
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  tags!: string[]

  @BidirektField()
  scores!: Array<number | null>

  @BidirektField()
  aliases!: readonly string[]

  @BidirektField()
  notes!: Record<string, string | null>

  @BidirektField()
  labels!: { [key: string]: string }

  @BidirektField()
  owner!: Owner

  @BidirektField()
  formerOwners!: Owner[]

  @BidirektField()
  ownersByCity!: Record<string, Owner>
}
```

```ts
// pet.ts
/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  tags: string[]

  /** @bidirekt field */
  scores: Array<number | null>

  /** @bidirekt field */
  aliases: readonly string[]

  /** @bidirekt field */
  notes: Record<string, string | null>

  /** @bidirekt field */
  labels: { [key: string]: string }

  /** @bidirekt field */
  owner: Owner

  /** @bidirekt field */
  formerOwners: Owner[]

  /** @bidirekt field */
  ownersByCity: Record<string, Owner>
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Owner:
    type: object
    properties:
      name:
        type: string
  Pet:
    type: object
    properties:
      tags:
        type: array
        items:
          type: string
      scores:
        type: array
        items:
          type: number
          nullable: true
      aliases:
        type: array
        items:
          type: string
      notes:
        type: map
        values:
          type: string
          nullable: true
      labels:
        type: map
        values:
          type: string
      owner:
        ref: Owner
      formerOwners:
        type: array
        items:
          ref: Owner
      ownersByCity:
        type: map
        values:
          ref: Owner
```

A decorated class can reference a tagged interface, and the other way round.

#### Declared types

A declared `type` is the whole type of the field, whatever TypeScript says: a primitive (`string`, `integer`, `float`, `number`, `boolean`), `T[]` for a list of `T`, or `map<T>` for a map of `T` (its keys are always strings), nested up to three levels in a decorator and to any depth in a tag (`integer[][]`, `map<float[]>`). `optional` and `nullable` still come from the TypeScript type when not declared:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ type: 'integer' })
  id!: number

  @BidirektField({ type: 'float' })
  weight!: number

  @BidirektField({ type: 'string' })
  bornAt?: Date | null

  @BidirektField({ type: 'integer[]' })
  scores!: number[]

  @BidirektField({ type: 'integer[][]' })
  grid!: number[][]

  @BidirektField({ type: 'map<float[]>' })
  readings!: Record<string, number[]>
}
```

```ts
// pet.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field type=integer */
  id: number

  /** @bidirekt field type=float */
  weight: number

  /** @bidirekt field type=string */
  bornAt?: Date | null

  /** @bidirekt field type=integer[] */
  scores: number[]

  /** @bidirekt field type=integer[][] */
  grid: number[][]

  /** @bidirekt field type=map<float[]> */
  readings: Record<string, number[]>
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      id:
        type: integer
      weight:
        type: float
      bornAt:
        type: string
        optional: true
        nullable: true
      scores:
        type: array
        items:
          type: integer
      grid:
        type: array
        items:
          type: array
          items:
            type: integer
      readings:
        type: map
        values:
          type: array
          items:
            type: float
```

In a tag, `type=` also takes a schema by its name in the contract, alone, in a list or in a map. A decorator references schemas by their TypeScript type instead:

```js
// shelter.js
/** @bidirekt schema */
export class Owner {
  /** @bidirekt field type=string */
  name
}

/** @bidirekt schema */
export class Shelter {
  /** @bidirekt field type=Owner */
  keeper

  /** @bidirekt field type=Owner[] */
  volunteers

  /** @bidirekt field type=map<Owner> */
  ownersByPet
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Owner:
    type: object
    properties:
      name:
        type: string
  Shelter:
    type: object
    properties:
      keeper:
        ref: Owner
      volunteers:
        type: array
        items:
          ref: Owner
      ownersByPet:
        type: map
        values:
          ref: Owner
```

#### Types `generate` can't translate

A type with no single contract type stops `generate` at its line. Declare a `type`, or declare a schema and use it as the type:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum Level {
  Low = 'low',
  High = 1,
}

export interface Address {
  street: string
}

export type Collar = {
  size: string
}

export class Toy {
  name = ''
}

export class Page<T> {
  items: T[] = []
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  code!: string | number

  @BidirektField()
  rank!: 1 | 2

  @BidirektField()
  level!: Level

  @BidirektField()
  extra!: unknown

  @BidirektField()
  data!: any

  @BidirektField()
  bornAt!: Date

  @BidirektField()
  location!: { street: string }

  @BidirektField()
  address!: Address

  @BidirektField()
  collar!: Collar

  @BidirektField()
  toy!: Toy

  @BidirektField()
  siblings!: Page<Pet>

  @BidirektField()
  scores!: Record<number, string>

  @BidirektField()
  nicknames!: Array<string | undefined>

  @BidirektField()
  tag = 'new'
}
```

```text
pet.ts:28 cannot translate "string | number" to a contract type: declare it with @BidirektField({ type })
pet.ts:31 cannot translate numeric literal type "1 | 2": use string literals or declare it with @BidirektField({ type })
pet.ts:34 cannot translate enum "Level" with string and numeric members: make all its members strings or all numbers
pet.ts:37 cannot translate "unknown" to a contract type: declare it with @BidirektField({ type })
pet.ts:40 cannot translate "any" to a contract type: declare it with @BidirektField({ type })
pet.ts:43 cannot translate "Date" to a contract type: declare it with @BidirektField({ type })
pet.ts:46 cannot translate inline object type "{ street: string }": declare a class with @BidirektSchema and use it as the type
pet.ts:49 cannot translate interface "Address": add "@bidirekt schema" above it
pet.ts:52 cannot translate object type "Collar": add "@bidirekt schema" above it
pet.ts:55 cannot translate class "Toy": add @BidirektSchema to it
pet.ts:58 cannot translate generic type "Page<Pet>": declare a non-generic class with @BidirektSchema and use it as the type
pet.ts:61 cannot translate "Record<number, string>": declare its key as string
pet.ts:64 cannot translate "string | undefined" to a contract type: declare it with @BidirektField({ type })
pet.ts:67 cannot read the type of "tag": write its type or declare it with @BidirektField({ type })
```

```ts
// pet.ts
export enum Level {
  Low = 'low',
  High = 1,
}

export interface Address {
  street: string
}

export type Collar = {
  size: string
}

export class Toy {
  name = ''
}

export class Page<T> {
  items: T[] = []
}

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field */
  code!: string | number

  /** @bidirekt field */
  rank!: 1 | 2

  /** @bidirekt field */
  level!: Level

  /** @bidirekt field */
  extra!: unknown

  /** @bidirekt field */
  data!: any

  /** @bidirekt field */
  bornAt!: Date

  /** @bidirekt field */
  location!: { street: string }

  /** @bidirekt field */
  address!: Address

  /** @bidirekt field */
  collar!: Collar

  /** @bidirekt field */
  toy!: Toy

  /** @bidirekt field */
  siblings!: Page<Pet>

  /** @bidirekt field */
  scores!: Record<number, string>

  /** @bidirekt field */
  nicknames!: Array<string | undefined>

  /** @bidirekt field */
  tag = 'new'
}
```

```text
pet.ts:26 cannot translate "string | number" to a contract type: declare it with "@bidirekt field type=<type>"
pet.ts:29 cannot translate numeric literal type "1 | 2": use string literals or declare it with "@bidirekt field type=<type>"
pet.ts:32 cannot translate enum "Level" with string and numeric members: make all its members strings or all numbers
pet.ts:35 cannot translate "unknown" to a contract type: declare it with "@bidirekt field type=<type>"
pet.ts:38 cannot translate "any" to a contract type: declare it with "@bidirekt field type=<type>"
pet.ts:41 cannot translate "Date" to a contract type: declare it with "@bidirekt field type=<type>"
pet.ts:44 cannot translate inline object type "{ street: string }": declare a class with "@bidirekt schema" and use it as the type
pet.ts:47 cannot translate interface "Address": add "@bidirekt schema" above it
pet.ts:50 cannot translate object type "Collar": add "@bidirekt schema" above it
pet.ts:53 cannot translate class "Toy": add "@bidirekt schema" above it
pet.ts:56 cannot translate generic type "Page<Pet>": declare a non-generic class with "@bidirekt schema" and use it as the type
pet.ts:59 cannot translate "Record<number, string>": declare its key as string
pet.ts:62 cannot translate "string | undefined" to a contract type: declare it with "@bidirekt field type=<type>"
pet.ts:65 cannot read the type of "tag": write its type or declare it with "@bidirekt field type=<type>"
```

A union of schemas without keys is an error too, see [Unions](#unions).

A class whose only declaration is a `.d.ts` outside `node_modules`, like the build output a workspace package's `types` point at, has lost its decorators, and stops `generate`:

```ts
// packages/dto/dist/index.d.ts
export declare class Owner {
  name: string
}
```

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import { Owner } from './packages/dto/dist/index.js'

@BidirektSchema()
export class Pet {
  @BidirektField()
  owner!: Owner
}
```

```text
pet.ts:8 class "Owner" comes from "packages/dto/dist/index.d.ts", which has no decorators: point the package's "types" or "exports" at its source
```

`@bidirekt schema` and `@bidirekt field` in a hand-written `.d.ts` of the project are read, see [JavaScript](#javascript). A `.d.ts` with its `.js` beside it is build output when the project leaves it out or it sits in a `dist`, `build` or `out` folder, and a tagged class, interface or type from it stops `generate` at the line that uses it, an `extends` too:

```ts
// dist/index.d.ts
/** @bidirekt schema */
export interface Entity {
  /** @bidirekt field */
  id: string
}

/** @bidirekt schema */
export type Owner = {
  /** @bidirekt field */
  name: string
}
```

```js
// dist/index.js
export {}
```

```ts
// pet.ts
import type { Entity, Owner } from './dist/index.js'

/** @bidirekt schema */
export interface Pet extends Entity {
  /** @bidirekt field */
  owner: Owner
}
```

```text
pet.ts:5 interface "Entity" comes from "dist/index.d.ts", which is build output, so its "@bidirekt" tags are not read: point the package's "types" or "exports" at its source
pet.ts:7 type "Owner" comes from "dist/index.d.ts", which is build output, so its "@bidirekt" tags are not read: point the package's "types" or "exports" at its source
```

### Schemas

#### Names

A schema is named after its class, interface or object type; `name` gives it another name in the contract. A tag marks a class, in TypeScript or JavaScript, an interface or an object type:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'PetResponse' })
export class Pet {
  @BidirektField()
  name!: string
}
```

```ts
// pet.ts
/** @bidirekt schema name=PetResponse */
export class Pet {
  /** @bidirekt field */
  name!: string
}
```

```ts
// pet.ts
/** @bidirekt schema name=PetResponse */
export interface Pet {
  /** @bidirekt field */
  name: string
}
```

```ts
// pet.ts
/** @bidirekt schema name=PetResponse */
export type Pet = {
  /** @bidirekt field */
  name: string
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  PetResponse:
    type: object
    properties:
      name:
        type: string
```

Every schema is written, even one no handler references. Two schemas with the same name in the contract stop `generate`; give one of them a `name`. An anonymous class (`export default class`) needs a `name`, and `Page<Pet>` stops `generate` even when `Page` is a schema.

A schema without a field stops `generate`, and so does a tag above an object type that is only an index signature: that is a map, used as a field's type:

```ts
// pet.ts
import { BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  name!: string
}

/** @bidirekt schema */
export interface Owner {
  name: string
}

/** @bidirekt schema */
export type Labels = { [key: string]: string }
```

```text
pet.ts:5 schema "Pet" has no field: annotate at least one field with @BidirektField
pet.ts:10 schema "Owner" has no field: annotate at least one field with "@bidirekt field"
pet.ts:14 "@bidirekt schema" is above type "Labels", which is a map, not an object: remove the tag and use "Labels" as a field's type
```

#### Enums

A string enum used by a field is written as a schema named after it. `@bidirekt schema` above the enum gives it another name, and writes it even when no field uses it, so tags can reference it (`@bidirekt response 200 PetStatus`, `type=PetStatus`). An enum without string members can't be a schema, and `generate` warns:

```ts
// status.ts
/** @bidirekt schema name=PetStatus */
export enum Status {
  Available = 'available',
  Sold = 'sold',
}

/** @bidirekt schema */
export enum Size {
  Small = 'small',
  Large = 'large',
}

/** @bidirekt schema */
export enum Priority {
  Low = 1,
  High = 2,
}
```

```text
status.ts:14 warning: "@bidirekt schema" is above enum "Priority", which has no string members, so it is not read: make its members strings
```

<!-- prettier-ignore -->
```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  PetStatus:
    type: enum
    members: ["available", "sold"]
  Size:
    type: enum
    members: ["small", "large"]
```

#### Inheritance

A schema class takes the annotated fields of its parent classes, whether or not they are schemas. A schema interface takes those of the interfaces it extends, and of all its blocks:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export class Entity {
  @BidirektField()
  id!: string
}

@BidirektSchema()
export class Pet extends Entity {
  @BidirektField()
  name!: string
}

@BidirektSchema()
export class Dog extends Pet {
  @BidirektField()
  breed!: string
}
```

```ts
// pet.ts
export class Entity {
  /** @bidirekt field */
  id!: string
}

/** @bidirekt schema */
export class Pet extends Entity {
  /** @bidirekt field */
  name!: string
}

/** @bidirekt schema */
export class Dog extends Pet {
  /** @bidirekt field */
  breed!: string
}
```

```ts
// pet.ts
export interface Entity {
  /** @bidirekt field */
  id: string
}

/** @bidirekt schema */
export interface Pet extends Entity {}

export interface Pet {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Dog extends Pet {
  /** @bidirekt field */
  breed: string
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Dog:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      breed:
        type: string
  Pet:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
```

A parent `generate` can't read, like a mixin or a utility type, stops it; declare the fields in the schema:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

type Constructor = new (...args: any[]) => object

function Timestamped<T extends Constructor>(base: T) {
  return class extends base {
    createdAt = ''
  }
}

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string
}

@BidirektSchema()
export class Dog extends Timestamped(Pet) {
  @BidirektField()
  breed!: string
}
```

```text
pet.ts:19 cannot read the parent "Timestamped(Pet)" of class "Dog": declare its fields
```

```ts
// pet.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string

  /** @bidirekt field */
  secret: string
}

/** @bidirekt schema */
export interface PublicPet extends Omit<Pet, 'secret'> {
  /** @bidirekt field */
  breed: string
}
```

```text
pet.ts:12 cannot read the parent "Omit<Pet, 'secret'>" of interface "PublicPet": declare its fields
```

### Unions

A field typed by a union of schemas declares the key of each member in `union`, also when the union is the items of a list or the values of a map. A tag names each member by its name in the contract. `null` and `undefined` in the type still make the field, its items or its values `nullable` or `optional`:

```ts
// order.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class CardPayment {
  @BidirektField()
  last4!: string
}

@BidirektSchema()
export class PixPayment {
  @BidirektField()
  key!: string
}

@BidirektSchema()
export class Order {
  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  payment!: CardPayment | PixPayment

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  refund?: CardPayment | PixPayment | null

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  history!: Array<CardPayment | PixPayment>

  @BidirektField({ union: { card: CardPayment, pix: PixPayment } })
  byMethod!: Record<string, CardPayment | PixPayment | null>
}
```

```ts
// order.ts
/** @bidirekt schema */
export interface CardPayment {
  /** @bidirekt field */
  last4: string
}

/** @bidirekt schema */
export interface PixPayment {
  /** @bidirekt field */
  key: string
}

/** @bidirekt schema */
export interface Order {
  /** @bidirekt field union={card: CardPayment, pix: PixPayment} */
  payment: CardPayment | PixPayment

  /** @bidirekt field union={card: CardPayment, pix: PixPayment} */
  refund?: CardPayment | PixPayment | null

  /** @bidirekt field union={card:CardPayment,pix:PixPayment} */
  history: Array<CardPayment | PixPayment>

  /** @bidirekt field union={card: CardPayment, pix: PixPayment} */
  byMethod: Record<string, CardPayment | PixPayment | null>
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  CardPayment:
    type: object
    properties:
      last4:
        type: string
  Order:
    type: object
    properties:
      payment:
        type: union
        members:
          card:
            ref: CardPayment
          pix:
            ref: PixPayment
      refund:
        type: union
        members:
          card:
            ref: CardPayment
          pix:
            ref: PixPayment
        optional: true
        nullable: true
      history:
        type: array
        items:
          type: union
          members:
            card:
              ref: CardPayment
            pix:
              ref: PixPayment
      byMethod:
        type: map
        values:
          type: union
          members:
            card:
              ref: CardPayment
            pix:
              ref: PixPayment
          nullable: true
  PixPayment:
    type: object
    properties:
      key:
        type: string
```

Spaces inside `union={...}` are optional. Without `union`, a union of schemas stops `generate`:

```ts
// order.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class CardPayment {
  @BidirektField()
  last4!: string
}

@BidirektSchema()
export class PixPayment {
  @BidirektField()
  key!: string
}

@BidirektSchema()
export class Order {
  @BidirektField()
  payment!: CardPayment | PixPayment
}
```

```text
order.ts:19 cannot translate union of classes "CardPayment | PixPayment": declare each member's key with @BidirektField({ union })
```

```ts
// order.ts
/** @bidirekt schema */
export interface CardPayment {
  /** @bidirekt field */
  last4: string
}

/** @bidirekt schema */
export interface PixPayment {
  /** @bidirekt field */
  key: string
}

/** @bidirekt schema */
export interface Order {
  /** @bidirekt field */
  payment: CardPayment | PixPayment
}
```

```text
order.ts:17 cannot translate union of classes "CardPayment | PixPayment": declare each member's key with "@bidirekt field union={<key>: <schema>, ...}"
```

The keys match the type: each schema of the union has one key, and each key names a schema of the union. A tag's `union=` is checked the same way:

```ts
// order.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class CardPayment {
  @BidirektField()
  last4!: string
}

@BidirektSchema()
export class PixPayment {
  @BidirektField()
  key!: string
}

@BidirektSchema()
export class BoletoPayment {
  @BidirektField()
  code!: string
}

@BidirektSchema()
export class Order {
  @BidirektField({ union: { card: CardPayment, boleto: BoletoPayment } })
  payment!: CardPayment | PixPayment

  @BidirektField({
    union: { card: CardPayment, debit: CardPayment, pix: PixPayment },
  })
  refund!: CardPayment | PixPayment
}
```

```text
order.ts:25 the "union" of @BidirektField lists "BoletoPayment", which is not in "CardPayment | PixPayment": remove its key or add it to the type
order.ts:30 the "union" of @BidirektField lists "CardPayment" more than once: keep one key for it
```

A member of `union=` is a schema name, never a list or a map:

```ts
// order.ts
/** @bidirekt schema */
export interface Card {
  /** @bidirekt field */
  last4: string
}

/** @bidirekt schema */
export interface Order {
  /** @bidirekt field union={card: Card[]} */
  payment: Card
}
```

```text
order.ts:10 cannot read "union={card: Card[]}" in "@bidirekt field": write "union={<key>: <schema>, ...}"
```

### Handlers

A handler declares one resource: its method, in uppercase (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), and its path as the contract writes it, with a `*` for each dynamic segment (`/pets/*` for `/pets/:id`). The request and each response status take a body:

| Body                     | Decorator                              | Tag                                   | Contract        |
| ------------------------ | -------------------------------------- | ------------------------------------- | --------------- |
| a schema                 | `Pet`                                  | `Pet`                                 | `Pet`           |
| a list                   | `[Pet]`                                | `Pet[]`                               | `PetList`       |
| a list with its own name | `{ list: Pet, name: 'PetCollection' }` | `Pet[] as PetCollection`              | `PetCollection` |
| no body                  | `null`                                 | nothing after the status or `request` | `~`             |

Without a request (no `request` option, no `@bidirekt request` tag), the resource has no `request` key. A tag names a schema by its name in the contract, which is not always its name in the code. A list is written once however many handlers use it.

In a tag, write a `*` before another segment as `*\/` (`/pets/*\/photos`): a bare `*/` would end the comment. `generate` reads `*\/` as `*/`:

```ts
// photos.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Photo {
  @BidirektField()
  url!: string
}

/**
 * @bidirekt provides GET /pets/*\/photos
 * @bidirekt response 200 Photo[]
 */
export function listPhotos() {}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets/*/photos:
      get:
        responses:
          200: PhotoList
schemas:
  Photo:
    type: object
    properties:
      url:
        type: string
  PhotoList:
    type: array
    items:
      ref: Photo
```

#### Providers

`@BidirektProvider` goes on a class method; `@bidirekt provides <METHOD> <path>` goes in the comment above a function, an exported arrow function, a method or a statement like `router.get(...)`:

```ts
// pets.ts
import {
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name!: string
}

@BidirektSchema()
export class NewPet {
  @BidirektField()
  name!: string
}

export class PetsController {
  @BidirektProvider({ method: 'GET', path: '/pets', responses: { 200: [Pet] } })
  list() {}

  @BidirektProvider({
    method: 'GET',
    path: '/pets/featured',
    responses: { 200: { list: Pet, name: 'PetCollection' } },
  })
  featured() {}

  @BidirektProvider({
    method: 'GET',
    path: '/pets/*',
    responses: { 200: Pet, 404: null },
  })
  find() {}

  @BidirektProvider({
    method: 'POST',
    path: '/pets',
    request: NewPet,
    responses: { 201: Pet, 400: null },
  })
  create() {}

  @BidirektProvider({
    method: 'PUT',
    path: '/pets/*',
    request: null,
    responses: { 204: null },
  })
  touch() {}

  @BidirektProvider({
    method: 'DELETE',
    path: '/pets/*',
    responses: { 204: null },
  })
  remove() {}
}
```

```ts
// pets.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface NewPet {
  /** @bidirekt field */
  name: string
}

/**
 * @bidirekt provides GET /pets
 * @bidirekt response 200 Pet[]
 */
export function listPets() {}

/**
 * @bidirekt provides GET /pets/featured
 * @bidirekt response 200 Pet[] as PetCollection
 */
export function featuredPets() {}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 * @bidirekt response 404
 */
export const findPet = (id: string) => id

/**
 * @bidirekt provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 Pet
 * @bidirekt response 400
 */
export function createPet(body: NewPet) {
  return body
}

/**
 * @bidirekt provides PUT /pets/*
 * @bidirekt request
 * @bidirekt response 204
 */
export function touchPet() {}

/**
 * @bidirekt provides DELETE /pets/*
 * @bidirekt response 204
 */
export default function removePet() {}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets:
      get:
        responses:
          200: PetList
      post:
        request: NewPet
        responses:
          201: Pet
          400: ~
    /pets/*:
      delete:
        responses:
          204: ~
      get:
        responses:
          200: Pet
          404: ~
      put:
        request: ~
        responses:
          204: ~
    /pets/featured:
      get:
        responses:
          200: PetCollection
schemas:
  NewPet:
    type: object
    properties:
      name:
        type: string
  Pet:
    type: object
    properties:
      name:
        type: string
  PetCollection:
    type: array
    items:
      ref: Pet
  PetList:
    type: array
    items:
      ref: Pet
```

The same method and path provided by two handlers stops `generate`.

#### Consumers

`@BidirektConsumer` and `@bidirekt consumes <provider> <METHOD> <path>` also name the provider:

```ts
// payments.ts
import {
  BidirektConsumer,
  BidirektField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Charge {
  @BidirektField()
  id!: string
}

@BidirektSchema()
export class NewCharge {
  @BidirektField({ type: 'integer' })
  amount!: number
}

export class PaymentsClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: NewCharge,
    responses: { 201: Charge, 402: null },
  })
  charge() {}

  @BidirektConsumer({
    provider: 'payments_api',
    method: 'GET',
    path: '/charges/*',
    responses: { 200: Charge },
  })
  find() {}
}
```

```ts
// payments.ts
/** @bidirekt schema */
export interface Charge {
  /** @bidirekt field */
  id: string
}

/** @bidirekt schema */
export interface NewCharge {
  /** @bidirekt field type=integer */
  amount: number
}

/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt request NewCharge
 * @bidirekt response 201 Charge
 * @bidirekt response 402
 */
export function createCharge(body: NewCharge) {
  return body
}

/**
 * @bidirekt consumes payments_api GET /charges/*
 * @bidirekt response 200 Charge
 */
export function findCharge(id: string) {
  return id
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
consumes:
  payments_api:
    rest:
      /charges:
        post:
          request: NewCharge
          responses:
            201: Charge
            402: ~
      /charges/*:
        get:
          responses:
            200: Charge
schemas:
  Charge:
    type: object
    properties:
      id:
        type: string
  NewCharge:
    type: object
    properties:
      amount:
        type: integer
```

The same resource consumed by several handlers, with decorators, tags or both, is written once with the statuses of all of them. They declare the same request, and the same schema for a status they share; otherwise `generate` stops, pointing at each handler:

```ts
// checkout.ts
import {
  BidirektConsumer,
  BidirektField,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Charge {
  @BidirektField()
  id!: string
}

export class CheckoutClient {
  @BidirektConsumer({
    provider: 'payments_api',
    method: 'POST',
    path: '/charges',
    request: null,
    responses: { 201: Charge, 402: null },
  })
  charge() {}
}
```

```ts
// retry.ts
/**
 * @bidirekt consumes payments_api POST /charges
 * @bidirekt request
 * @bidirekt response 201 Charge
 * @bidirekt response 409
 */
export function retryCharge() {}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
consumes:
  payments_api:
    rest:
      /charges:
        post:
          request: ~
          responses:
            201: Charge
            402: ~
            409: ~
schemas:
  Charge:
    type: object
    properties:
      id:
        type: string
```

#### Mistakes `generate` stops at

A method in lowercase, a status with a leading zero, and a decorator and a tag on the same handler, schema or field:

```ts
// pets.ts
import { BidirektProvider } from '@bidirekt/typescript-sdk'

/**
 * @bidirekt provides get /pets
 * @bidirekt response 200
 */
export function listPets() {}

/**
 * @bidirekt provides POST /pets
 * @bidirekt response 0201
 */
export function createPet() {}

export class PetsController {
  /**
   * @bidirekt provides GET /pets/*
   * @bidirekt response 200
   */
  @BidirektProvider({
    method: 'GET',
    path: '/pets/*',
    responses: { 200: null },
  })
  find() {}
}
```

```text
pets.ts:5 method "get" must be uppercase: write "GET"
pets.ts:12 response status "0201" must be written as 201
pets.ts:18 @BidirektProvider and "@bidirekt provides GET /pets/*" are both on this handler: keep one
pets.ts:21 @BidirektProvider and "@bidirekt provides GET /pets/*" are both on this handler: keep one
```

A decorator status written as a string with a leading zero, like `'0201'`, gets the same error.

### JavaScript

In JavaScript, a schema is a class with tags. A field's type comes from `type=` or its JSDoc `@type`, never from its initial value; `@type` reads a `@typedef`, `import('./owner.js').Owner`, `?T` (`T | null`), `!T` (`T`) and `Object.<string, T>` (a map):

```js
// owner.js
/** @bidirekt schema */
export class Owner {
  /** @bidirekt field
   *  @type {string} */
  name
}
```

```js
// pet.js
/** @typedef {'small' | 'large'} Size */

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field
   *  @type {Size} */
  size

  /** @bidirekt field
   *  @type {import('./owner.js').Owner} */
  owner

  /** @bidirekt field
   *  @type {?string} */
  nickname

  /** @bidirekt field
   *  @type {!string} */
  name

  /** @bidirekt field
   *  @type {Object.<string, number>} */
  scores
}
```

<!-- prettier-ignore -->
```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Owner:
    type: object
    properties:
      name:
        type: string
  Pet:
    type: object
    properties:
      size:
        type: enum
        members: ["small", "large"]
      owner:
        ref: Owner
      nickname:
        type: string
        nullable: true
      name:
        type: string
      scores:
        type: map
        values:
          type: number
```

A `@typedef` is never a schema, even with a tag; `generate` warns, and a field typed by it stops it, as does `String`, `Number` or `Boolean` for its lowercase type:

```js
// pet.js
/**
 * @bidirekt schema
 * @typedef {object} Address
 * @property {string} street
 */

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field
   *  @type {Address} */
  address

  /** @bidirekt field
   *  @type {String} */
  name
}
```

```text
pet.js:3 warning: "@bidirekt schema" is on a @typedef, so it is not read: declare the schema as a class with "@bidirekt schema"
pet.js:12 cannot translate "Address" to a contract type: declare it with "@bidirekt field type=<type>" or a JSDoc @type
pet.js:16 cannot translate "String" to a contract type: write "string" in lowercase
```

`generate` reads the `.js` files of a project with a `jsconfig.json` or with no config at all; with a `tsconfig.json`, only when it sets `allowJs`.

A hand-written `.d.ts` beside a `.js` of the project is read too. There, `@bidirekt schema` and `@bidirekt field` on an interface or an object type are read, and every other tag and every decorator is not, like those TypeScript copies into the declarations it emits; a name the `.js` also exports is read from the `.js` only:

```ts
// pets.d.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}

export declare function findPet(): Pet
```

```js
// pets.js
/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {
  return { name: 'Rex' }
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets/*:
      get:
        responses:
          200: Pet
schemas:
  Pet:
    type: object
    properties:
      name:
        type: string
```

So a `Pet` the `.js` exports without tags is not a schema, whatever the `.d.ts` says:

```ts
// pets.d.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}
```

```js
// pets.js
export class Pet {
  name = ''
}

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet() {
  return new Pet()
}
```

```text
pets.js:8 schema "Pet" is not declared: reference a schema by its name in the contract
```

And a decorated class in a `.d.ts` is not read:

```ts
// pet.d.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export declare class Pet {
  @BidirektField()
  name: string
}
```

```text
no @bidirekt/typescript-sdk annotation found in ".": nothing to generate
```

Nor is a tagged class there, so a field typed by it, or a class that extends it, stops `generate`:

```ts
// owner.d.ts
/** @bidirekt schema */
export declare class Owner {
  /** @bidirekt field */
  name: string
}
```

```ts
// pet.ts
import type { Owner } from './owner.js'

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  owner: Owner
}
```

```text
pet.ts:7 class "Owner" is declared in "owner.d.ts", where only an interface or object type is read: declare it as an interface there, or tag the class in its source
```

Declarations emitted into a folder of their own, next to the sources, repeat the tagged interfaces of those sources. With no config, `generate` leaves out the `dist`, `build`, `out` and `coverage` folders at any depth; with a config, leave that folder out with `exclude`:

```ts
// pet.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}
```

```ts
// dist/pet.d.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string
}
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      name:
        type: string
```

### Tags

A tag is `@bidirekt <keyword>` followed by its arguments, separated by spaces, at the start of a line of a `/** */` comment; the keywords are `provides`, `consumes`, `request`, `response`, `schema` and `field`. A comment declares at most one handler, and can also declare schemas, see [Schemas in a handler's comment](#schemas-in-a-handlers-comment). `/* */` and `//` comments are not read, other tags in the same comment (`@param`, `@response`) are left alone, and a `@bidirekt` later in a line, in a ` ``` ` fence or in an `@example` is not a tag. A fence may come before or after the tags. `generate` warns when one followed by a keyword is left unread, so it never vanishes silently:

````ts
// pets.ts
/*
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200
 */
export function findPet() {}

// @bidirekt provides GET /pets
// @bidirekt response 200
export function listPets() {}

/**
 * Creates a pet, declared for @bidirekt/typescript-sdk and read by @bidirekt tooling.
 * It is listed by @bidirekt provides GET /pets.
 *
 * ```ts
 * // @bidirekt provides POST /fenced
 * ```
 *
 * @param body the new pet
 * @response 201 the created pet
 * @bidirekt provides POST /pets
 * @bidirekt response 201
 *
 * ```ts
 * createPet({ name: 'Rex' })
 * ```
 * @example
 * @bidirekt provides POST /example
 */
export function createPet(body: unknown) {
  return body
}
````

```text
pets.ts:14 warning: "@bidirekt provides" is not at the start of a comment line, so it is not read: start the line with it
pets.ts:29 warning: "@bidirekt provides" is inside an @example, so it is not read: move it above the @example
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets:
      post:
        responses:
          201: ~
```

Only a `description` value is quoted, and only a `union=` value is grouped in `{...}`; quotes or braces anywhere else stop `generate`:

```ts
// pet.ts
/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field description="The pet's name, as the owner says it" */
  name: string

  /** @bidirekt field name="nick_name" */
  nickname: string
}

/**
 * @bidirekt provides GET /owners/{ id }
 * @bidirekt response 200
 */
export function findOwner() {}
```

```text
pet.ts:7 cannot read "@bidirekt field name="nick_name"": remove the quotes, only description="<text>" takes them
pet.ts:12 cannot read "@bidirekt provides GET /owners/{ id }": write "@bidirekt provides <METHOD> <path>"
```

A misspelled tag name, like `@Bidirekt` or `@bidirektresponse`, is not read, and `generate` warns:

```ts
// pets.ts
/**
 * @bidirekt provides GET /pets
 * @bidirekt response 200
 * @Bidirekt response 404
 */
export function listPets() {}
```

```text
pets.ts:5 warning: "@Bidirekt" is not a @bidirekt tag: write "@bidirekt <keyword>"
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets:
      get:
        responses:
          200: ~
```

Tags of a handler, a schema or a field written in two comments on the same element, or `@bidirekt schema` on two blocks of an interface, stop `generate`:

```ts
// pets.ts
/** @bidirekt provides GET /pets */
/** @bidirekt provides GET /animals */
export function listPets() {}

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field name=pet_name */
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  age: number
}
```

```text
pets.ts:3 a handler is declared more than once on this element: keep one "@bidirekt provides" or "@bidirekt consumes" comment
pets.ts:9 "@bidirekt field" is declared more than once on property "name": keep one
pets.ts:13 "@bidirekt schema" is declared more than once on interface "Pet": keep one
```

A comment goes above the statement or declaration it annotates, and above its decorators. A tag comment `generate` can't attach to one, like a comment between a decorator and its method or inside a chain of route calls, is not read, and `generate` warns:

```ts
// pets.ts
function Get(_path: string) {
  return (_target: object, _key: string): void => {}
}

class Router {
  route(_path: string): Router {
    return this
  }

  get(_handler: () => void): Router {
    return this
  }
}

export const router = new Router()
router
  .route('/pets/:id')
  /** @bidirekt provides GET /pets/* */
  .get(() => {})

export class PetsController {
  /**
   * @bidirekt provides GET /pets
   * @bidirekt response 200
   */
  @Get('')
  findAll() {}

  @Get(':id')
  /** @bidirekt provides GET /pets/* */
  findOne() {}
}
```

```text
pets.ts:19 warning: this comment is not above a statement or declaration, so its "@bidirekt" tags are not read: move it above the statement or declaration, before its decorators
pets.ts:31 warning: this comment is not above a statement or declaration, so its "@bidirekt" tags are not read: move it above the statement or declaration, before its decorators
```

```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets:
      get:
        responses:
          200: ~
```

## The `generate` command

`generate` reads the `tsconfig.json` in the current folder, or the `jsconfig.json` when there is none, or the `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`, `.cjs` and `.jsx` files in it when there is neither, leaving out `node_modules` and, at any depth, `dist`, `build`, `out` and `coverage`, and writes `contracts/generated.yaml` in the project's folder. It reads the source code and never runs your app. A package of your workspace, which npm links into `node_modules`, is read as your code when its `types` or `exports` point at its source: its annotated classes keep their fields and can be referenced. A class, interface or type reached through its built `.d.ts` stops `generate`. A syntax error in a file it reads stops it. A JavaScript project with a `tsconfig.json` needs `allowJs` in it for the `.js` files to be read; with a `jsconfig.json`, or with no config, they always are.

- `--project <tsconfig>` reads another project, and writes to its folder.
- `--out <file>` writes to another file.
- `--check` writes nothing and exits with 1 when the file on disk differs from what `generate` would write.

Each error is printed as `file:line message`; on an error nothing is written and the exit code is 1.

## Docs

https://bidirekt.com/docs

## Development

Read [CONTRIBUTING.md](CONTRIBUTING.md). The two packages live in `packages/` as npm workspaces. With Node.js 24, the version CI uses, install the dependencies and run the checks from the repository root before you open a pull request:

```sh
npm ci
npm run check
npm run lint
npm run typecheck
npm test
```

## License

MIT, see [LICENSE](LICENSE).
