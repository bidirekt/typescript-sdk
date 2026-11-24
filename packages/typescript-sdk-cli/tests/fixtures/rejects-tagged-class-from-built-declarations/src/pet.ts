import { Owner } from '@acme/dto'

/** @bidirekt schema */
export class Pet {
  /** @bidirekt field */
  owner!: Owner
}

/**
 * @bidirekt rest provides GET /owners/*
 * @bidirekt response 200 Owner
 */
export function findOwner() {}

/** @bidirekt schema */
export class Admin extends Owner {
  /** @bidirekt field */
  role!: string
}
