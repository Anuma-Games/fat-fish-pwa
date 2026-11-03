/** The browser could not reach the server, or the Service Worker had nothing cached (it answers 504). */
export function esSinConexion(status: number): boolean {
  return status === 0 || status === 504;
}

/** Failures that may disappear by themselves, so a queued submission is worth trying again. */
export function esReintentable(status: number): boolean {
  return esSinConexion(status) || status === 408 || status === 429 || status >= 500;
}
