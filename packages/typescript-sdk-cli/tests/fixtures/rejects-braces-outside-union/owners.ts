/**
 * @bidirekt provides GET /owners/{ id }
 * @bidirekt response 200
 */
export function findOwner() {}

/**
 * @bidirekt consumes {payments api} POST /charges
 * @bidirekt response 201
 */
export function charge() {}

/** @bidirekt schema name={Pet Status} */
export class Status {
  /** @bidirekt field */
  code!: string
}
