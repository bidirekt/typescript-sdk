/** @bidirekt schema */
export interface UserName {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema union={User: UserName} */
export type Labels = { [key: string]: string }
