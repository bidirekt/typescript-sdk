import type { Pet } from './pets.js'

/**
 * @bidirekt provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet(): Pet {
  return { name: 'Rex' }
}
