import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema({ name: 'Animal' })
@BidirektSchema({ name: 'Pet' })
export class Pet {
  @BidirektField({ name: 'nickname' })
  @BidirektField({ name: 'name' })
  name: string
}
