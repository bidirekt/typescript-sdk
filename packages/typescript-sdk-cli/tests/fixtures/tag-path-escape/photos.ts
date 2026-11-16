import { BidirektSchema, BidirektField } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Photo {
  @BidirektField()
  url: string
}

/**
 * @bidirekt provides GET /pets/*\/photos
 * @bidirekt response 200 Photo[]
 */
export function listPhotos() {}
