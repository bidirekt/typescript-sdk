/** @bidirekt schema */
export interface AvailablePet {
  /** @bidirekt field */
  name: string
}

/** @bidirekt schema union={Available: AvailablePet} */
export enum PetStatus {
  Available = 'available',
  Sold = 'sold',
}
