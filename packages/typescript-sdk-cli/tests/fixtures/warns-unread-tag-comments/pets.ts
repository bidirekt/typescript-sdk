type Handler = () => void

class Router {
  get(path: string, handler: Handler): Router {
    return this
  }

  delete(handler: Handler): Router {
    return this
  }

  route(path: string): Router {
    return this
  }
}

function Get(path: string) {
  return (target: object, key: string): void => {}
}

function listPets() {}
function findPet() {}
function deletePet() {}

export const app = new Router()
  /** @bidirekt rest provides GET /pets */
  .get('/pets', listPets)

export const router = new Router()
router
  .route('/pets/:id')
  /** @bidirekt rest provides GET /pets/* */
  .get('/pets/:id', findPet)
  /** @bidirekt rest provides DELETE /pets/* */
  .delete(deletePet)

router.get(/** @bidirekt rest provides GET /owners/* */ '/owners/:id', findPet)

export class PetsController {
  @Get(':id')
  /** @bidirekt rest provides GET /toys/* */
  findOne() {}

  /**
   * @bidirekt rest provides GET /toys
   * @bidirekt response 200
   */
  findAll() {}
}
