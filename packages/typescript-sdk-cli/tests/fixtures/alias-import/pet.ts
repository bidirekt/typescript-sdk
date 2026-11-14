import {
  BidirektField as Field,
  BidirektSchema as Schema,
} from '@bidirekt/typescript-sdk'

@Schema()
export class Pet {
  @Field()
  name: string
}
