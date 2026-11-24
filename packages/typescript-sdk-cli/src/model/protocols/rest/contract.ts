import type { SourceLocation } from '../../contract.ts'

export type Body = {
  schema: string | null
  location: SourceLocation
}

export type Response = Body & {
  status: number
}

export type Resource = {
  method: string
  path: string
  request?: Body
  responses: Array<Response>
  location: SourceLocation
}
