import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefiereMenosMovimiento } from './motion';

/**
 * Fades an element in when it enters the screen. Elements already on the first screen, browsers
 * without IntersectionObserver and reduced motion keep it visible from the start.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'lp-reveal' },
})
export class Reveal {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined' || prefiereMenosMovimiento()) return;
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('lp-wait');
      const observer = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            el.classList.remove('lp-wait');
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
