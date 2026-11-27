/**
 * @bidirekt provides GET /health
 * @bidirekt response 200 Health
 *
 * @bidirekt schema Health
 * @bidirekt field status type=string
 */
export function health() {}

/**
 * @bidirekt consumes petstore_api GET /pets
 * @bidirekt response 200
 */
export function pets() {}

/**
 * @bidirekt handles GET /owners
 *
 * @bidirekt schema Owner
 * @bidirekt field name type=string
 */
export function owners() {}
