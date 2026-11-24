import type { Pet } from './pets.js'

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 */
export function findPet(): Pet {
  return { name: 'Rex' }
}
