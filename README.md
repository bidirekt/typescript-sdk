# Bidirekt TypeScript SDK

[![CI](https://img.shields.io/github/actions/workflow/status/bidirekt/typescript-sdk/ci.yml?branch=main&label=CI)](https://github.com/bidirekt/typescript-sdk/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/bidirekt/typescript-sdk)](LICENSE)

In Bidirekt, each side of an integration declares in a contract file what it provides and what it consumes. This SDK writes that file from TypeScript and JavaScript code: you annotate the schemas and the handlers that provide or consume each resource, run `generate`, and get `contracts/generated.yaml`, ready for `bidirekt validate` and `bidirekt publish`. It comes in two packages: `@bidirekt/typescript-sdk`, the decorators your code imports, and `@bidirekt/typescript-sdk-cli`, the `generate` command.

Once a service adopts the SDK, every resource and schema it provides or consumes is annotated in its code, and `contracts/generated.yaml` is its contract file. A subgraph also publishes its own GraphQL schema beside it, which the SDK never writes: see The `generate` command.

## Installation

Both packages need Node.js 22.12 or later. Install the `generate` command as a dev dependency:

```sh
npm install --save-dev @bidirekt/typescript-sdk-cli
```

With decorators, your app imports them at runtime, so install them as a regular dependency too (they have no dependencies of their own). With tags only, the command is all you need.

```sh
npm install @bidirekt/typescript-sdk
```

Their types need TypeScript 5.0 or later. GraphQL contracts need the Bidirekt CLI and broker 0.4.0 or later.

## Quickstart

`petstore_ts` provides `GET /pets/*` and `POST /pets`, and consumes `GET /ratings/*` from `petstore_reviews`. There are two ways to annotate it, and both write the same contract: decorators, for code with classes, or `@bidirekt` tags in `/** */` comments, for interfaces, function handlers and plain JavaScript. One service can use both, never both on the same element. A property without an annotation, like `internalNotes`, stays out of the contract.

### With decorators

`@BidirektSchema` marks a schema and `@BidirektField` each field of the contract. A field's type comes from TypeScript; declare a `type` when TypeScript can't say it, as `integer` or `float` for a `number`:

```ts
// pet.ts
import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

export enum PetStatus {
  Available = 'available',
  Sold = 'sold',
}

@BidirektSchema()
export class Owner {
  @BidirektField()
  name!: string
}

@BidirektSchema()
export class Shelter {
  @BidirektField()
  city!: string
}

@BidirektSchema()
export class Pet {
  @BidirektField({ type: 'integer' })
  petId!: number

  @BidirektField()
  name!: string

  @BidirektField()
  status!: PetStatus

  @BidirektField()
  size!: 'small' | 'large'

  @BidirektField({ type: 'float' })
  weight!: number

  @BidirektField({ type: 'string', description: 'ISO 8601 date' })
  birthDate!: Date

  @BidirektField()
  nickname?: string

  @BidirektField()
  owner!: Owner | null

  @BidirektField({ union: { owner: Owner, shelter: Shelter } })
  origin!: Owner | Shelter

  @BidirektField()
  tags!: string[]

  @BidirektField()
  vaccines!: Record<string, string>

  internalNotes!: string
}

@BidirektSchema()
export class NewPet {
  @BidirektField()
  name!: string
}

@BidirektSchema()
export class Rating {
  @BidirektField({ type: 'integer' })
  stars!: number
}
```

`@BidirektRestProvider` on a method declares a resource it provides (NestJS here). A body is a schema class, or `null` for no body:

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
import { BidirektRestProvider } from '@bidirekt/typescript-sdk'
import { NewPet, Pet } from './pet.js'

@Controller('pets')
export class PetsController {
  private readonly pets = new Map<number, Pet>()

  @Get(':petId')
  @BidirektRestProvider({
    method: 'GET',
    path: '/pets/*',
    responses: { 200: Pet, 404: null },
  })
  find(@Param('petId') petId: string): Pet {
    const pet = this.pets.get(Number(petId))
    if (pet === undefined) {
      throw new NotFoundException()
    }
    return pet
  }

  @Post()
  @BidirektRestProvider({
    method: 'POST',
    path: '/pets',
    request: NewPet,
    responses: { 201: Pet, 400: null },
  })
  create(@Body() body: NewPet): Pet {
    if (typeof body.name !== 'string') {
      throw new BadRequestException()
    }
    const pet = Object.assign(new Pet(), { petId: this.pets.size + 1, ...body })
    this.pets.set(pet.petId, pet)
    return pet
  }
}
```

`@BidirektRestConsumer` declares a resource it consumes, and names the provider:

```ts
// ratings.client.ts
import { BidirektRestConsumer } from '@bidirekt/typescript-sdk'
import { Rating } from './pet.js'

export class RatingsClient {
  @BidirektRestConsumer({
    provider: 'petstore_reviews',
    method: 'GET',
    path: '/ratings/*',
    responses: { 200: Rating, 404: null },
  })
  async find(petId: number): Promise<Rating | null> {
    const response = await fetch(`http://petstore-reviews/ratings/${petId}`)
    return response.status === 404 ? null : ((await response.json()) as Rating)
  }
}
```

### With tags

`@bidirekt schema` above an `interface`, an object `type` or a class marks a schema, and `@bidirekt field` each field; `field` takes the same options as the decorator, as `key=value`. `@bidirekt rest provides <METHOD> <path>` or `@bidirekt rest consumes <provider> <METHOD> <path>` above a handler declares its resource, then `@bidirekt request [schema]` and one `@bidirekt response <status> [schema]` per status, where nothing after the status means no body:

```ts
// pet.ts
export enum PetStatus {
  Available = 'available',
  Sold = 'sold',
}

/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Shelter {
  /** @bidirekt field */
  city: string
}

/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field type=integer */
  petId: number

  /** @bidirekt field */
  name: string

  /** @bidirekt field */
  status: PetStatus

  /** @bidirekt field */
  size: 'small' | 'large'

  /** @bidirekt field type=float */
  weight: number

  /** @bidirekt field type=string description="ISO 8601 date" */
  birthDate: Date

  /** @bidirekt field */
  nickname?: string

  /** @bidirekt field */
  owner: Owner | null

  /** @bidirekt field union={owner: Owner, shelter: Shelter} */
  origin: Owner | Shelter

  /** @bidirekt field */
  tags: string[]

  /** @bidirekt field */
  vaccines: Record<string, string>

  internalNotes: string
}

/** @bidirekt schema */
export interface NewPet {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema */
export interface Rating {
  /** @bidirekt field type=integer */
  stars: number
}
```

```ts
// pets.ts
import express from 'express'
import type { NewPet, Pet } from './pet.ts'

const pets = new Map<string, Pet>()

export const router = express.Router()

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 * @bidirekt response 404
 */
router.get('/pets/:petId', (req, res) => {
  const pet = pets.get(req.params.petId)
  if (pet === undefined) {
    res.sendStatus(404)
    return
  }
  res.json(pet)
})

/**
 * @bidirekt rest provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 Pet
 * @bidirekt response 400
 */
router.post('/pets', (req, res) => {
  const body = req.body as Partial<NewPet>
  if (typeof body.name !== 'string') {
    res.sendStatus(400)
    return
  }
  res.status(201).json({ petId: pets.size + 1, name: body.name })
})
```

```ts
// ratings.ts
import type { Rating } from './pet.ts'

/**
 * @bidirekt rest consumes petstore_reviews GET /ratings/*
 * @bidirekt response 200 Rating
 * @bidirekt response 404
 */
export async function findRating(petId: number): Promise<Rating | null> {
  const response = await fetch(`http://petstore-reviews/ratings/${petId}`)
  return response.status === 404 ? null : ((await response.json()) as Rating)
}
```

### The contract

Run `generate` in the project folder:

```sh
npx @bidirekt/typescript-sdk-cli generate
```

Either example writes the same `contracts/generated.yaml`. `status`, a string `enum`, becomes a `PetStatus` enum schema, `size` an inline enum, `owner` a `ref` to the `Owner` schema, and `origin` a union keyed by `union`:

<!-- prettier-ignore -->
```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
provides:
  rest:
    /pets:
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
  petstore_reviews:
    rest:
      /ratings/*:
        get:
          responses:
            200: Rating
            404: ~
schemas:
  NewPet:
    type: object
    properties:
      name:
        type: string
  Owner:
    type: object
    properties:
      name:
        type: string
  Pet:
    type: object
    properties:
      petId:
        type: integer
      name:
        type: string
      status:
        ref: PetStatus
      size:
        type: enum
        members: ["small", "large"]
      weight:
        type: float
      birthDate:
        type: string
        description: ISO 8601 date
      nickname:
        type: string
        optional: true
      owner:
        ref: Owner
        nullable: true
      origin:
        type: union
        members:
          owner:
            ref: Owner
          shelter:
            ref: Shelter
      tags:
        type: array
        items:
          type: string
      vaccines:
        type: map
        values:
          type: string
  PetStatus:
    type: enum
    members: ["available", "sold"]
  Rating:
    type: object
    properties:
      stars:
        type: integer
  Shelter:
    type: object
    properties:
      city:
        type: string
```

## Schemas in a handler's comment

A handler that builds its body by hand, with no type to read, declares the schema in its own comment: `@bidirekt schema <Name>` opens a schema and each following `@bidirekt field <name> type=...` is a field of it, until the next `schema` or the end of the comment. `type=` is required there. These schemas belong to the whole contract, so other handlers and fields reference them by name:

```ts
// health.ts
import express from 'express'

export const router = express.Router()

/**
 * @bidirekt rest provides GET /health
 * @bidirekt response 200 Health
 *
 * @bidirekt schema Health
 * @bidirekt field status type=string
 * @bidirekt field checks type=HealthCheck[]
 *
 * @bidirekt schema HealthCheck
 * @bidirekt field name type=string
 * @bidirekt field error type=string nullable=true
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', checks: [{ name: 'database', error: null }] })
})
```

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
      checks:
        type: array
        items:
          ref: HealthCheck
  HealthCheck:
    type: object
    properties:
      name:
        type: string
      error:
        type: string
        nullable: true
```

## JavaScript

In JavaScript, a schema is a class with tags, and the handler tags are the same as in TypeScript. A field's type comes from `type=` or from its JSDoc `@type`, never from its initial value; `@type` reads a `@typedef`, `import('./owner.js').Owner`, `?T` (`T | null`), `!T` (`T`) and `Object.<string, T>` (a map):

```js
// pet.js
/** @typedef {'small' | 'large'} Size */

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field type=integer */
  petId

  /** @bidirekt field
   *  @type {?string} */
  nickname

  /** @bidirekt field
   *  @type {Size} */
  size
}
```

<!-- prettier-ignore -->
```yaml
# Generated by @bidirekt/typescript-sdk. Do not edit.
schemas:
  Pet:
    type: object
    properties:
      petId:
        type: integer
      nickname:
        type: string
        nullable: true
      size:
        type: enum
        members: ["small", "large"]
```

`generate` reads the `.js` files of a project with a `jsconfig.json` or with no config at all; with a `tsconfig.json`, only when it sets `allowJs`. A hand-written `.d.ts` beside a `.js` is read too, but only its `@bidirekt schema` and `@bidirekt field` on an interface or an object type, and a name the `.js` also exports is read from the `.js` only. A `@typedef` is never a schema, and `String`, `Number` or `Boolean` stop `generate`: write the lowercase type.

## The `generate` command

```sh
npx @bidirekt/typescript-sdk-cli generate
npx @bidirekt/typescript-sdk-cli generate --check
```

`generate` reads the `tsconfig.json` in the current folder, or the `jsconfig.json` when there is none, or the `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`, `.cjs` and `.jsx` files in it when there is neither, leaving out `node_modules` and, at any depth, `dist`, `build`, `out` and `coverage`. It writes `contracts/generated.yaml` in the project's folder, whole, on every run. It reads the source code and never runs your app.

- `--project <tsconfig>` reads another project, and writes to its folder.
- `--out <file>` writes to another file.
- `--check` writes nothing and exits with 1 when the file on disk differs from what `generate` would write (`"contracts/generated.yaml" is out of date: run generate without --check`). Run it in CI.

Each error is printed as `file:line message`; on an error nothing is written and the exit code is 1. A warning is printed as `file:line warning: message` and doesn't change the exit code.

You never edit `contracts/generated.yaml` by hand: the next `generate` writes over it. Regenerate it whenever an annotation or an annotated type changes, commit it with the code, and ship it like any contract file:

```sh
npx @bidirekt/typescript-sdk-cli generate
bidirekt validate contracts/generated.yaml
bidirekt validate contracts/generated.yaml --participant petstore_ts --environment production
bidirekt publish contracts/generated.yaml --participant petstore_ts --version 1.4.0
bidirekt can-i-deploy petstore_ts --version 1.4.0 --environment production
# deploy
bidirekt record-deployment petstore_ts --version 1.4.0 --environment production
```

`validate` without `--participant` and `--environment` checks only the file; with them, it also compares the file with what is deployed in that environment. When `can-i-deploy` reports a break, fix the annotation or the type in the code and generate again.

A subgraph, a service that declares its graph with `@BidirektGraph` or `@bidirekt graph`, validates and publishes its own GraphQL schema together with the contract: `bidirekt validate contracts/generated.yaml src/schema.graphql`, and the same two files in `publish`. `contracts/generated.yaml` alone fails with `graph "petstore_graph" without a GraphQL schema`.

A package of your workspace, which npm links into `node_modules`, is read as your code when its `types` or `exports` point at its source. A class, interface or type reached through its built `.d.ts` stops `generate`.

## Reference

### Decorators

| Decorator                           | Goes on    | Options                                                                        |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `@BidirektSchema(options?)`         | a class    | `name`, `union`                                                                |
| `@BidirektField(options?)`          | a property | `type`, `name`, `optional`, `nullable`, `description`, `union`, see Fields     |
| `@BidirektRestProvider(options)`    | a method   | `method`, `path`, `request`, `responses`                                       |
| `@BidirektRestConsumer(options)`    | a method   | `provider`, `method`, `path`, `request`, `responses`                           |
| `@BidirektGraphqlConsumer(options)` | a method   | `provider`, `query` or `mutation`, `arguments`, `returns`, see GraphQL returns |
| `@BidirektGraphqlField(options?)`   | a property | the options of `@BidirektField`, `scalar`, `arguments`, see Fields             |
| `@BidirektGraph(name)`              | a class    | none: `name` is the graph the service is a subgraph of                         |

`generate` recognizes a decorator by where it is imported from, `@bidirekt/typescript-sdk`, also through an alias, `import * as` or a re-export in your own code, never by its name. Options are written in place, as literals and classes, never through a variable. A decorator built at runtime (returned by a wrapper function, applied in a loop) is not read, and `generate` warns. A decorator on a `static` property is not read either, and `generate` warns.

With `emitDecoratorMetadata` on (NestJS, TypeORM), TypeScript keeps the imports of decorated classes at runtime, so classes that reference each other can fail at startup with `Cannot access 'Pet' before initialization`, and each decorated field emits its type as metadata that other libraries act on (class-transformer's implicit conversion, for example, turns `'10'` into `10`). Annotate such classes with tags instead.

### Tags

| Tag                                                            | Goes above                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `@bidirekt schema [name=<Name>] [union={...}]`                 | a class, an `interface`, an object `type` or a string `enum`                   |
| `@bidirekt field [key=value ...]`                              | a property of a schema                                                         |
| `@bidirekt rest provides <METHOD> <path>`                      | a function, an exported arrow function, a method or a statement (`router.get`) |
| `@bidirekt rest consumes <provider> <METHOD> <path>`           | the same                                                                       |
| `@bidirekt request [body]`                                     | follows `rest provides` or `rest consumes`                                     |
| `@bidirekt response <status> [body]`                           | follows `rest provides` or `rest consumes`, once per status                    |
| `@bidirekt graphql consumes <provider> query\|mutation <name>` | the same as `rest provides`                                                    |
| `@bidirekt arguments <schema>`, `@bidirekt returns <type>`     | follow `graphql consumes`, see GraphQL returns                                 |
| `@bidirekt graphql field [key=value ...]`                      | a property of a schema, in place of `field`, see Fields                        |
| `@bidirekt graph <name>`                                       | a class or any other element: `name` is the graph the service is a subgraph of |

- A handler's comment can also declare schemas, see [Schemas in a handler's comment](#schemas-in-a-handlers-comment).
- A tag starts a line of a `/** */` comment, and its arguments are separated by spaces. Only a `description` value is quoted (`description="Shown on the card"`), and inside the quotes it holds only ASCII letters and digits, with single spaces between words. Only a `union=` value is grouped in `{...}`, with optional spaces inside; quotes or braces anywhere else stop `generate`.
- A comment goes above the statement or declaration it annotates, and above its decorators. It declares at most one handler; tags of one element written in two comments, or `@bidirekt schema` on two blocks of one interface, stop `generate`.
- A tag names a schema by its name in the contract, which is not always its name in the code. In any tag, `type=` also takes a schema name, alone, in a list or in a map (`HealthCheck`, `HealthCheck[]`, `map<HealthCheck>`).
- In a path, write a `*` before another segment as `*\/` (`/pets/*\/photos`): a bare `*/` would end the comment. `generate` reads `*\/` as `*/`.
- `/* */` and `//` comments are not read, other tags in the same comment (`@param`) are left alone, and a `@bidirekt` later in a line, in a ` ``` ` fence or in an `@example` is not a tag. `generate` warns about a tag it leaves unread, a misspelled one (`@Bidirekt`) and a tag comment it can't attach to an element (between a decorator and its method, inside a chain of route calls), so none vanishes silently.

### Handlers

A handler declares one resource: its method, in uppercase (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), and its path as the contract writes it, with a `*` for each dynamic segment (`/pets/*` for `/pets/:id`). The request and each response status take a body:

| Body                     | Decorator                              | Tag                                   | Contract        |
| ------------------------ | -------------------------------------- | ------------------------------------- | --------------- |
| a schema                 | `Pet`                                  | `Pet`                                 | `Pet`           |
| a list                   | `[Pet]`                                | `Pet[]`                               | `PetList`       |
| a list with its own name | `{ list: Pet, name: 'PetCollection' }` | `Pet[] as PetCollection`              | `PetCollection` |
| no body                  | `null`                                 | nothing after the status or `request` | `~`             |

Without a request (no `request` option, no `@bidirekt request` tag), the resource has no `request` key. A list is written once however many handlers use it. The same method and path provided by two handlers stops `generate`. The same resource consumed by several handlers, with decorators, tags or both, is written once with the statuses of all of them; they declare the same request, and the same schema for a status they share.

### GraphQL returns

`@BidirektGraphqlConsumer({ provider, query, arguments, returns })` on a method declares a GraphQL query the service calls, and `mutation` in place of `query` a mutation; with tags, `@bidirekt graphql consumes <provider> query|mutation <name>` above a handler, with `@bidirekt arguments <schema>` and `@bidirekt returns <type>`. `provider` names the service that answers the call, or a federated graph, and then the call is checked against the graph its subgraphs compose. `arguments` is a schema, and `returns` the shape the call reads:

| Returns                 | Decorator                                                     | Tag                                              | Contract        |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------ | --------------- |
| a schema                | `Pet`                                                         | `Pet`                                            | `Pet`           |
| a schema or null        | `{ nullable: Pet }`                                           | `Pet?`                                           | `PetOrNull`     |
| a list                  | `[Pet]` or `{ list: Pet }`                                    | `Pet[]`                                          | `PetList`       |
| a list or null          | `{ list: Pet, nullable: true }`                               | `Pet[]?`                                         | `PetListOrNull` |
| a list of items or null | `{ list: Pet, nullableItems: true }`                          | `Pet?[]`                                         | `PetOrNullList` |
| a primitive             | `'boolean'`                                                   | `boolean`                                        | `Boolean`       |
| a custom scalar         | `{ scalar: 'DateTime' }`                                      | `scalar:DateTime`                                | `DateTime`      |
| an enum                 | `{ enum: ['AVAILABLE', 'SOLD'], name: 'Status' }`             | `enum:AVAILABLE\|SOLD as Status`                 | `Status`        |
| a union                 | `{ union: { Pet: Pet, Owner: Owner }, name: 'SearchResult' }` | `union={Pet: Pet, Owner: Owner} as SearchResult` | `SearchResult`  |

A primitive, a scalar, an enum or a union also takes the place of the schema in a nullable or a list (`{ nullable: 'integer' }`, `'string[]'`, `scalar:DateTime?[]`). Each key of a union is the name of one of its types in the provider's GraphQL schema, and its value the schema the call reads from that type. Each form but a schema returned as it is becomes a schema of the contract, with the name above, and `name` in the decorator or `as <name>` in the tag gives it another one (`{ nullable: Pet, name: 'MaybePet' }`, `Pet? as MaybePet`). They name only a schema `generate` creates: a schema returned as it is is not copied, the call references it by its own name, so `@bidirekt returns Pet as MyPet` stops `generate`. To call it `MyPet`, name the schema itself, with `@BidirektSchema({ name })` or `@bidirekt schema name=<Name>`. A primitive returned as it is takes another name only in the tag (`boolean as Flag`): in the decorator it is a bare string, `'boolean'`, always written as `Boolean`. An enum or a union in a nullable or a list is a schema of its own, under the name it declares, and the nullable or the list references it under the name above: `{ nullable: { enum: ['AVAILABLE', 'SOLD'], name: 'Status' } }` and `enum:AVAILABLE|SOLD? as Status` both write `Status` and `StatusOrNull: {ref: Status, nullable: true}`. In the tag, that `as` names the enum or the union, never the nullable or the list around it. A scalar in a nullable or a list takes no name of its own: the name goes on the nullable or the list, and in the tag `as` names them.

A call that reads a GraphQL interface both on the interface and on the types that implement it, as `node(id: $id) { id ... on User { name } ... on Pet { species } }`, returns a schema with a `union`: its fields are the ones read on the interface, and `union` maps each type read with `... on` to the schema the call reads from it. `@BidirektSchema({ union: { User: UserName, Pet: PetSpecies } })` on a class `Node` with `@BidirektField() id`, or `@bidirekt schema union={User: UserName, Pet: PetSpecies}` above `interface Node` with a `@bidirekt field` on `id`, writes `Node` as `type: union`, with `id` in its `properties` and `User` and `Pet` in its `members`. A member's schema holds only the fields read on its own type: a member class that extends `Node` would repeat `id`. A schema with a `union` and no field writes only the `members`, a named union like `{ union: {...}, name }`. `union=` goes above a class, an interface or an object type, never above an enum.

### Fields

| Decorator                                       | Tag                                          | What it declares                                                                                                                |
| ----------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `type: 'integer'`                               | `type=integer`                               | the whole type of the field, see [Types](#types)                                                                                |
| `name: 'birth_date'`                            | `name=birth_date`                            | the field's name in the contract; without it, the property's name                                                               |
| `optional: true`                                | `optional=true`                              | whether the field can be absent; without it, from `?` or `undefined` in the type                                                |
| `nullable: true`                                | `nullable=true`                              | whether the field can be `null`; without it, from `null` in the type                                                            |
| `description: 'Shown on the card'`              | `description="Shown on the card"`            | the field's description, ASCII letters and digits with single spaces between words; only a declared one, a plain comment is not |
| `union: { card: CardPayment, pix: PixPayment }` | `union={card: CardPayment, pix: PixPayment}` | the key of each member of a union of schemas                                                                                    |

A `union` names each schema of the field's union once, by one key, and nothing else; a tag names each member by its name in the contract, never a list or a map. It applies to the union of the field, of its items or of its values (`Array<Card | Pix>`), and `null` and `undefined` in the type still make them `nullable` or `optional`.

In a GraphQL contract, `@BidirektGraphqlField` takes the place of `@BidirektField` on a field that needs GraphQL's own options, and `@bidirekt graphql field` that of `@bidirekt field`. They take the options above, plus `scalar: 'DateTime'`, a custom scalar that replaces the field's type and is written as `type: scalar, name: DateTime`, and `arguments: ReviewsArgs`, the schema of the arguments the call passes to the field, as `first` in `reviews(first: 10)`. In a tag, `scalar=DateTime` and `arguments=ReviewsArgs`. A field takes one of the two, never both.

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

A type alias is followed to its type, a generic one too. A string enum or a literal union imported from a dependency translates the same way. A decorated class can reference a tagged interface, and the other way round.

A declared `type` is the whole type of the field, whatever TypeScript says: a primitive (`string`, `integer`, `float`, `number`, `boolean`), `T[]` for a list of `T`, or `map<T>` for a map of `T` (its keys are always strings), nested up to three levels in a decorator and to any depth in a tag (`integer[][]`, `map<float[]>`). `integer` and `float` come only from a declared type. `optional` and `nullable` still come from the TypeScript type when not declared.

### Schemas

- A schema is named after its class, interface or object type; `name` gives it another name in the contract. An anonymous class (`export default class`) needs a `name`.
- Every schema is written, even one no handler references. Two schemas with the same name in the contract stop `generate`; give one of them a `name`.
- A schema without a field or a `union` stops `generate`, and so does `@bidirekt schema` above an object type that is only an index signature: that is a map, used as a field's type.
- A string enum used by a field is written as a schema named after it. `@bidirekt schema` above the enum gives it another name with `name=`, and writes it even when no field uses it, so tags can reference it (`@bidirekt response 200 PetStatus`). An enum without string members can't be a schema, and `generate` warns.
- A schema class takes the annotated fields of its parent classes, whether or not they are schemas; a schema interface takes those of the interfaces it extends, and of all its blocks. A parent `generate` can't read, like a mixin or a utility type (`Omit<Pet, 'secret'>`), stops it: declare the fields in the schema.

### Describe what the code does

The contract describes what the code does, not the type the code declares. The TypeScript type is where each field starts, and a declared `type`, `optional` or `nullable` wins over it. In the [Quickstart](#quickstart), `birthDate` is a `Date` in the code and a string in the body, so it declares `type: 'string'`. A `name: string | null` that the code always fills declares `nullable: false`; a field the code always sends, though typed `name?: string`, declares `optional: false`.

### Mistakes `generate` stops at

`generate` prints each at its `file:line` and writes nothing. The usual ones:

- `cannot translate "Date" to a contract type: declare it with @BidirektField({ type })`, and the same for `any`, `unknown`, `string | number` or the `string | undefined` of `Array<string | undefined>`; with a tag it says `declare it with "@bidirekt field type=<type>"`.
- `cannot translate numeric literal type "1 | 2": use string literals or declare it with @BidirektField({ type })`
- `cannot translate enum "Level" with string and numeric members: make all its members strings or all numbers`
- `cannot translate inline object type "{ street: string }": declare a class with @BidirektSchema and use it as the type`
- `cannot translate interface "Address": add "@bidirekt schema" above it`, and likewise for an object type or a class that is not a schema.
- `cannot translate generic type "Page<Pet>": declare a non-generic class with @BidirektSchema and use it as the type`
- `cannot translate "Record<number, string>": declare its key as string`
- `cannot read the type of "tag": write its type or declare it with @BidirektField({ type })`, for a property with only an initial value.
- `cannot translate union of classes "CardPayment | PixPayment": declare each member's key with @BidirektField({ union })`
- `cannot read the parent "Timestamped(Pet)" of class "Dog": declare its fields`
- `class "Owner" comes from "packages/dto/dist/index.d.ts", which has no decorators: point the package's "types" or "exports" at its source`
- `schema "Pet" has no field: annotate at least one field with @BidirektField`
- `schema "Pet" is not declared: reference a schema by its name in the contract`
- `schema name "Pet" is declared more than once: give each schema a distinct name`
- `method "get" must be uppercase: write "GET"`
- `response status "0201" must be written as 201`, also for a decorator status written as `'0201'`.
- `@BidirektRestProvider and "@bidirekt rest provides GET /pets/*" are both on this handler: keep one`; a decorator and a tag on the same schema or field stop it too.

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
