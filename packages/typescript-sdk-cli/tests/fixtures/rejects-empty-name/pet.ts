import {
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: '' })
export class Pet {
  @BidirektField()
  name: string
}

@BidirektSchema()
export class Owner {
  @BidirektField({ name: '' })
  name: string
}

export class OwnersController {
  @BidirektProvider({
    method: 'GET',
    path: '/owners',
    responses: { 200: { list: Owner, name: '' } },
  })
  list(): void {}
}
