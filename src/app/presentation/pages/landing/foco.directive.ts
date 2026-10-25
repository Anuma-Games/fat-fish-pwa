import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefiereMenosMovimiento } from './motion';

/**
 * "The lamp follows you": the element stays in half light and lights up while it crosses the
 * middle of the screen (or under the pointer). Without IntersectionObserver or with reduced
 * motion it is simply lit.
 */
@Directive({ selector: '[appFoco]' })
export class Foco {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined' || prefiereMenosMovimiento()) return;
      el.classList.add('lp-foco');
      const observador = new IntersectionObserver(
        ([entrada]) => el.classList.toggle('lp-iluminado', entrada.isIntersecting),
        { rootMargin: '-30% 0px -30% 0px' },
      );
      observador.observe(el);
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }
}
