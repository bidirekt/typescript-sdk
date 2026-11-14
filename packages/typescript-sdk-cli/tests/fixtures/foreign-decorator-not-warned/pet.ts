import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'
import { Field, ObjectType } from './nestjs/graphql.ts'

@ObjectType()
@BidirektSchema()
export class Pet {
  @Field()
  @BidirektField()
  name: string

  @Field()
  nickname: string
}
