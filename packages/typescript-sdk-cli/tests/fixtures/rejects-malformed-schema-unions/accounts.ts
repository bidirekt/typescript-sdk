/** @bidirekt schema union={User} */
export interface Account {}

/** @bidirekt schema union={User: Missing} */
export interface Member {
  /** @bidirekt field */
  id: string
}
