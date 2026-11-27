/** @bidirekt schema */
export interface OwnerEmail {
  /** @bidirekt field */
  email: string
}

/** @bidirekt schema name=Account union={Owner: OwnerEmail, Account: Account} */
export interface Profile {
  /** @bidirekt field */
  id: string
}
