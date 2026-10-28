/** True when the visitor asked the system for less motion (or the browser cannot tell). */
export function prefiereMenosMovimiento(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
}

/**
 * Fallback for browsers without scroll-driven animations (Firefox): keeps `--avance` on `raiz`
 * between 0 and 1 with the page scroll, so the CSS can turn the wheel and fill the progress bar.
 * Returns the function that removes the listeners.
 */
export function seguirAvance(raiz: HTMLElement): () => void {
  if (globalThis.CSS?.supports?.('animation-timeline: scroll()')) return () => {};
  let pendiente = 0;
  const medir = () => {
    pendiente = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const avance = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    raiz.style.setProperty('--avance', avance.toFixed(4));
  };
  const alCambiar = () => {
    pendiente ||= requestAnimationFrame(medir);
  };
  window.addEventListener('scroll', alCambiar, { passive: true });
  window.addEventListener('resize', alCambiar);
  medir();
  return () => {
    cancelAnimationFrame(pendiente);
    window.removeEventListener('scroll', alCambiar);
    window.removeEventListener('resize', alCambiar);
  };
}

/** True on screens narrower than a tablet. */
export function esTelefono(): boolean {
  return window.matchMedia?.('(max-width: 640px)').matches ?? false;
}

/** True on devices with a mouse or trackpad (cursor and magnetic buttons only apply there). */
export function puedeApuntar(): boolean {
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
}

/**
 * Typewriter: calls `alEscribir` with a growing part of `texto` every `ms` milliseconds.
 * With reduced motion it writes everything at once. Returns the function that stops it.
 */
export function escribir(
  texto: string,
  alEscribir: (parcial: string) => void,
  ms = 45,
): () => void {
  if (prefiereMenosMovimiento()) {
    alEscribir(texto);
    return () => {};
  }
  let n = 0;
  alEscribir('');
  const reloj = setInterval(() => {
    n++;
    alEscribir(texto.slice(0, n));
    if (n >= texto.length) clearInterval(reloj);
  }, ms);
  return () => clearInterval(reloj);
}
