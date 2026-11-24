/**
 * @bidirekt rest provides GET /health
 * @bidirekt response 200 Health
 *
 * @bidirekt schema Health
 * @bidirekt field status type=string
 * @bidirekt field uptime type=integer
 * @bidirekt field checks type=HealthCheck[]
 * @bidirekt field slowest type=HealthCheck optional=true
 *
 * @bidirekt schema HealthCheck
 * @bidirekt field name type=string description="Shown on the status page"
 * @bidirekt field ok type=boolean
 * @bidirekt field error type=string nullable=true
 */
export function health() {
  return { status: 'ok', uptime: 1, checks: [] }
}

/**
 * @bidirekt rest provides GET /health/checks
 * @bidirekt response 200 HealthCheck[]
 */
export function healthChecks() {
  return []
}
