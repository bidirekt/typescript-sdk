/** @bidirekt schema name=PetCard */
export class Pet {
  /** @bidirekt field type=integer */
  id: number

  /** @bidirekt field name=birth_date */
  birthDate?: string | null

  internalNotes: string
}
