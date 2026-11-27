import { http } from './http.ts'
import type { Charge, NewCharge } from './schemas.ts'

/**
 * @bidirekt rest consumes payments_api POST /charges
 * @bidirekt request NewCharge
 * @bidirekt response 201 Charge
 */
export const createCharge = (body: NewCharge) => http.post<Charge>('/charges', body)
