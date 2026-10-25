import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { CRUPIER } from '../../../core/config/landing.config';

/** Seconds without moving, scrolling or typing before the Crupier asks if the visitor is still there. */
const INACTIVO_S = 25;

export interface Frase {
  texto: string;
  id: number;
}

/**
 * The Crupier's voice on the landing page: one short line at a time (CrupierVoz shows it). Lives in
 * memory, provided by LandingPage, like the visit dossier.
 */
@Injectable()
export class Crupier {
  private readonly destroyRef = inject(DestroyRef);
  readonly frase = signal<Frase | null>(null);

  private id = 0;
  private ocultar?: ReturnType<typeof setTimeout>;
  private readonly dichas = new Set<string>();

  /** Shows a line for a few seconds. With `unaVez`, a line already said is skipped. */
  decir(texto: string, unaVez = false): void {
    if (unaVez && this.dichas.has(texto)) return;
    this.dichas.add(texto);
    this.frase.set({ texto, id: ++this.id });
    clearTimeout(this.ocultar);
    this.ocultar = setTimeout(() => this.frase.set(null), 2600 + texto.length * 70);
  }

  /** Greets the visitor and starts watching for inactivity. */
  iniciar(): void {
    const saludo = setTimeout(() => this.decir(CRUPIER.bienvenida, true), 1800);
    let inactivo = setTimeout(avisar, INACTIVO_S * 1000);
    const self = this;
    function avisar() {
      self.decir(CRUPIER.inactivo);
      inactivo = setTimeout(avisar, INACTIVO_S * 2000);
    }
    const reiniciar = () => {
      clearTimeout(inactivo);
      inactivo = setTimeout(avisar, INACTIVO_S * 1000);
    };
    const eventos = ['pointermove', 'pointerdown', 'scroll', 'keydown'] as const;
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));

    this.destroyRef.onDestroy(() => {
      clearTimeout(saludo);
      clearTimeout(inactivo);
      clearTimeout(this.ocultar);
      eventos.forEach((e) => window.removeEventListener(e, reiniciar));
    });
  }
}
