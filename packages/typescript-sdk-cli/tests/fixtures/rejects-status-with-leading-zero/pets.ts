import {
  BidirektField,
  BidirektRestProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

export class PetsController {
  @BidirektRestProvider({
    method: 'GET',
    path: '/pets/*',
    responses: {
      200: Pet,
      '0200': null,
    },
  })
  find(): void {}
}
