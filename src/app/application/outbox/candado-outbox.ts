/** Web Lock shared with public/sw.js: the page and the service worker never send at the same time. */
export const CANDADO_OUTBOX = 'fatfish-outbox';

/** Runs `fn` holding the outbox lock; without the Web Locks API (old browsers, jsdom) it just runs it. */
export function conCandadoOutbox<T>(fn: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  return locks ? locks.request(CANDADO_OUTBOX, fn) : fn();
}
