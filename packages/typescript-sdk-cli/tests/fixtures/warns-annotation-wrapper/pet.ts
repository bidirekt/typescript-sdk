import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

const ContractField = () => BidirektField({ type: 'integer' })

@BidirektSchema()
export class Pet {
  @ContractField()
  id: number

  @BidirektField()
  name: string
}
