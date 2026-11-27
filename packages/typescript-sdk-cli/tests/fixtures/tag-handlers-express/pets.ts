import express from './express.ts'

export const petsRouter = express.Router()

function findPet() {}

function createPet() {}

/**
 * @bidirekt rest provides GET /pets/*
 * @bidirekt response 200 Pet
 * @bidirekt response 404
 */
petsRouter.get('/pets/:id', findPet)

/**
 * @bidirekt rest provides POST /pets
 * @bidirekt request NewPet
 * @bidirekt response 201 Pet
 * @bidirekt response 400
 */
petsRouter.post('/pets', createPet)
