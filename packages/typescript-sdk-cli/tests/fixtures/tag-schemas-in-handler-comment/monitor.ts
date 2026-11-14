/** @bidirekt schema */
export class Monitor {
  /** @bidirekt field type=Health */
  latest: unknown

  /** @bidirekt field type=map<HealthCheck[]> */
  history: unknown
}

/** @bidirekt schema */
export interface Probe {
  /** @bidirekt field type=HealthCheck */
  check: object
}
