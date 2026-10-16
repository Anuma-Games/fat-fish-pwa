import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Pixels in a metre at 96 dpi, to show how far the visitor scrolled. */
const PX_POR_METRO = 3780;
const INTERACTIVOS = 'a, button, summary, [data-duda]';

/**
 * "Expediente de tu visita": what the landing page notices about the visitor while it is open.
 * It lives only in memory (provided by LandingPage), is never stored or sent anywhere and starts
 * over on every reload. It does not use any service of the PWA.
 */
@Injectable()
export class VisitDossier {
  private readonly destroyRef = inject(DestroyRef);

  readonly segundos = signal(0);
  readonly seccionesVistas = signal(0);
  readonly seccionesTotales = signal(0);
  readonly clics = signal(0);
  /** Longest time, in seconds, between pointing at a link or button and clicking it. */
  readonly mayorDuda = signal<number | null>(null);
  readonly metros = signal(0);
  /** The visitor left the first screen (the floating panel only shows after that). */
  readonly fueraDelInicio = signal(false);
  /** The closing section is on screen or already passed (it shows the full dossier, so the panel hides). */
  readonly enCierre = signal(false);

  readonly tiempo = computed(() => {
    const s = this.segundos();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  /** Starts listening inside `raiz`; every listener is removed when the page is destroyed. */
  iniciar(raiz: HTMLElement): void {
    const inicio = Date.now();
    const reloj = setInterval(
      () => this.segundos.set(Math.floor((Date.now() - inicio) / 1000)),
      1000,
    );

    let apuntandoDesde: number | null = null;
    const interactivo = (t: EventTarget | null) =>
      t instanceof Element ? t.closest(INTERACTIVOS) : null;
    const alApuntar = (e: PointerEvent) => {
      if (interactivo(e.target)) apuntandoDesde ??= performance.now();
    };
    const alSalir = (e: PointerEvent) => {
      if (!interactivo(e.relatedTarget)) apuntandoDesde = null;
    };
    const alClic = (e: MouseEvent) => {
      this.clics.update((n) => n + 1);
      if (apuntandoDesde !== null && interactivo(e.target)) {
        const duda = (performance.now() - apuntandoDesde) / 1000;
        if (duda > (this.mayorDuda() ?? 0)) this.mayorDuda.set(duda);
        apuntandoDesde = performance.now();
      }
    };

    const cierre = raiz.querySelector<HTMLElement>('[data-seccion="cierre"]');
    let ultimoY = window.scrollY;
    let recorrido = 0;
    const alDesplazar = () => {
      recorrido += Math.abs(window.scrollY - ultimoY);
      ultimoY = window.scrollY;
      this.metros.set(recorrido / PX_POR_METRO);
      this.fueraDelInicio.set(window.scrollY > window.innerHeight * 0.6);
      this.enCierre.set(!!cierre && cierre.getBoundingClientRect().top < window.innerHeight * 0.6);
    };

    raiz.addEventListener('pointerover', alApuntar);
    raiz.addEventListener('pointerout', alSalir);
    raiz.addEventListener('click', alClic);
    window.addEventListener('scroll', alDesplazar, { passive: true });
    alDesplazar();

    const secciones = raiz.querySelectorAll<HTMLElement>('[data-seccion]');
    this.seccionesTotales.set(secciones.length);
    let observador: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      const vistas = new Set<Element>();
      observador = new IntersectionObserver(
        (entradas) => {
          for (const entrada of entradas) {
            if (entrada.isIntersecting) vistas.add(entrada.target);
          }
          this.seccionesVistas.set(vistas.size);
        },
        // A section counts as seen when it crosses the middle of the screen.
        { rootMargin: '-45% 0px -45% 0px' },
      );
      secciones.forEach((s) => observador!.observe(s));
    }

    this.destroyRef.onDestroy(() => {
      clearInterval(reloj);
      raiz.removeEventListener('pointerover', alApuntar);
      raiz.removeEventListener('pointerout', alSalir);
      raiz.removeEventListener('click', alClic);
      window.removeEventListener('scroll', alDesplazar);
      observador?.disconnect();
    });
  }
}
