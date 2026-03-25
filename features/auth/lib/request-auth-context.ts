import { AsyncLocalStorage } from "node:async_hooks"

const accessTokenStorage = new AsyncLocalStorage<string>()

export function runWithAccessToken<T>(
  accessToken: string,
  operation: () => Promise<T>
) {
  return accessTokenStorage.run(accessToken, operation)
}

export function getCurrentAccessToken() {
  return accessTokenStorage.getStore()
}
