import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { escribir } from '../../pages/landing/motion';

/**
 * Header of the pages of the app (README 8.3), like the hero of the landing page: a hanging lamp
 * that switches on when the page opens, the title with the scan lines of an old monitor and a gold
 * line below it. Whatever the page puts inside (a button, for example) goes under that line.
 *
 * With `crupier`, the Crupier says a line under the header, typed as on the landing page. Screen
 * readers hear the whole line once.
 */
@Component({
  selector: 'app-cabecera-pagina',
  templateUrl: './cabecera-pagina.html',
  styleUrl: './cabecera-pagina.css',
})
export class CabeceraPagina {
  readonly eyebrow = input.required<string>();
  readonly titulo = input.required<string>();
  readonly claim = input<string>();
  readonly crupier = input<string>();

  /** The Crupier's line, as far as it has been typed. */
  protected readonly frase = signal('');

  constructor() {
    let detener = () => {};
    effect(() => {
      const linea = this.crupier() ?? '';
      untracked(() => {
        detener();
        detener = escribir(linea, (parcial) => this.frase.set(parcial), 28);
      });
    });
    inject(DestroyRef).onDestroy(() => detener());
  }
}
