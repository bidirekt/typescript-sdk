type Handler = (request: unknown) => unknown

type Route = {
  method: string
  path: string
  handler: Handler
}

function Router() {
  const routes: Array<Route> = []
  return {
    routes,
    get(path: string, handler: Handler) {
      routes.push({ method: 'GET', path, handler })
    },
    post(path: string, handler: Handler) {
      routes.push({ method: 'POST', path, handler })
    },
  }
}

export default { Router }
