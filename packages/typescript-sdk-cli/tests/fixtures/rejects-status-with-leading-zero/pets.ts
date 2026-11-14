import {
  BidirektField,
  BidirektProvider,
  BidirektSchema,
} from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField()
  name: string
}

export class PetsController {
  @BidirektProvider({
    method: 'GET',
    path: '/pets/*',
    responses: {
      200: Pet,
      '0200': null,
    },
  })
  find(): void {}
}
