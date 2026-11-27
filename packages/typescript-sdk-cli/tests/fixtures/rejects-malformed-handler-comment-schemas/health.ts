/**
 * @bidirekt rest provides GET /health
 * @bidirekt response 200 Health
 * @bidirekt field status type=string
 *
 * @bidirekt schema Health
 * @bidirekt field uptime
 * @bidirekt field checks type=HealthCheck[]
 * @bidirekt field name=status type=string
 *
 * @bidirekt schema name=Probe
 * @bidirekt field ok type=boolean
 */
export function health() {}

/**
 * @bidirekt rest provides GET /status
 * @bidirekt response 200 Health
 *
 * @bidirekt schema Health
 * @bidirekt field state type=string
 */
export function status() {}

/**
 * @bidirekt rest provides GET /uptime
 * @bidirekt response 200 Uptime
 *
 * @bidirekt schema Uptime
 * @bidirekt field since type=Instant
 * @bidirekt field samples type=map<Sample[]>
 */
export function uptime() {}

/** @bidirekt schema */
export class Monitor {
  /** @bidirekt field type=Missing */
  latest: unknown
}
