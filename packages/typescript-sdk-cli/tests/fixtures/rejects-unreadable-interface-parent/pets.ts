/** @bidirekt schema */
export interface Pet {
  /** @bidirekt field */
  name: string

  /** @bidirekt field */
  secret: string
}

type Named = { name: string } & { nickname: string }

/** @bidirekt schema */
export interface PublicPet extends Omit<Pet, 'secret'> {
  /** @bidirekt field */
  breed: string
}

/** @bidirekt schema */
export interface DraftPet extends Partial<Pet> {
  /** @bidirekt field */
  draft: boolean
}

/** @bidirekt schema */
export interface Tag extends Named {
  /** @bidirekt field */
  color: string
}
