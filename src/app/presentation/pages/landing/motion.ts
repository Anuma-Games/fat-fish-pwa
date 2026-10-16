/** True when the visitor asked the system for less motion (or the browser cannot tell). */
export function prefiereMenosMovimiento(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
}

/** True on screens narrower than a tablet. */
export function esTelefono(): boolean {
  return window.matchMedia?.('(max-width: 640px)').matches ?? false;
}
