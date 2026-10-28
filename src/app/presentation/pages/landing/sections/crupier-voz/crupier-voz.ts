import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Crupier } from '../../crupier';
import { escribir } from '../../motion';

/** The Crupier's current line, typed letter by letter under the nav. */
@Component({
  selector: 'app-landing-crupier-voz',
  templateUrl: './crupier-voz.html',
  styleUrl: './crupier-voz.css',
  host: { '[class.visible]': 'crupier.frase() !== null' },
})
export class CrupierVoz {
  protected readonly crupier = inject(Crupier);
  protected readonly escrito = signal('');

  constructor() {
    let detener = () => {};
    inject(DestroyRef).onDestroy(() => detener());
    effect(() => {
      const frase = this.crupier.frase();
      detener();
      if (frase) detener = escribir(frase.texto, (t) => this.escrito.set(t), 55);
    });
  }
}
