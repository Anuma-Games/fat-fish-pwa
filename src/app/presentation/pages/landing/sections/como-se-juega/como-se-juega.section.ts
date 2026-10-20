import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { PASOS, PILARES, VUELTA } from '../../../../../core/config/landing.config';
import { PixelIcon } from '../../../../components/pixel-icon/pixel-icon';
import { Foco } from '../../foco.directive';
import { escribir, prefiereMenosMovimiento } from '../../motion';
import { Reveal } from '../../reveal.directive';

/** Bars of the rising goal; they fade out to the right instead of ending. */
const BARRAS = 16;

/**
 * "Cómo se juega": the loop of one round (bet, spin, score, goal, shop) that returns to the table
 * with a higher goal. It does not say how many rounds a run has.
 */
@Component({
  selector: 'app-landing-como-se-juega',
  imports: [PixelIcon, Reveal, Foco],
  templateUrl: './como-se-juega.section.html',
  styleUrl: './como-se-juega.section.css',
})
export class ComoSeJuegaSection {
  protected readonly pasos = PASOS;
  protected readonly vuelta = VUELTA;
  protected readonly pilares = PILARES;
  protected readonly metas = Array.from({ length: BARRAS }, (_, i) =>
    Math.round(10 + 90 * Math.pow(i / (BARRAS - 1), 1.6)),
  );
  protected readonly fichas = [0, 1, 2, 3, 4];
  private readonly ejemplo = PASOS.find((p) => p.ejemplo)?.ejemplo ?? '';
  /** The worked example is typed when it reaches the screen; it is complete at rest. */
  protected readonly formula = signal(this.ejemplo);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = host.querySelector('.ejemplo');
      if (!el || typeof IntersectionObserver === 'undefined' || prefiereMenosMovimiento()) return;
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      this.formula.set('');
      let detener = () => {};
      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) return;
          observador.disconnect();
          detener = escribir(this.ejemplo, (t) => this.formula.set(t), 70);
        },
        { rootMargin: '0px 0px -20% 0px' },
      );
      observador.observe(el);
      destroyRef.onDestroy(() => {
        observador.disconnect();
        detener();
      });
    });
  }
}
