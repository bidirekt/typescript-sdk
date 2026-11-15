/** @bidirekt schema */
export declare class Pet {
  /** @bidirekt field */
  name: string
}
/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export declare function findPet(): Pet
/** @bidirekt schema */
export interface Owner {
  /** @bidirekt field */
  name: string
}
