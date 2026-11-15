export const http = {
  post<T>(path: string, body: unknown): Promise<T> {
    return Promise.resolve({ path, body } as T)
  },
}
