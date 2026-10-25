import { Directive, ElementRef, inject } from '@angular/core';
import { prefiereMenosMovimiento, puedeApuntar } from './motion';

/** Magnetic button: it leans a little toward the pointer. Only with a mouse and without reduced motion. */
@Directive({
  selector: '[appIman]',
  host: {
    class: 'lp-iman',
    '(pointermove)': 'acercar($event)',
    '(pointerleave)': 'soltar()',
  },
})
export class Iman {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly activo = puedeApuntar() && !prefiereMenosMovimiento();

  protected acercar(e: PointerEvent): void {
    if (!this.activo) return;
    const caja = this.el.getBoundingClientRect();
    const dx = e.clientX - (caja.left + caja.width / 2);
    const dy = e.clientY - (caja.top + caja.height / 2);
    this.el.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`;
  }

  protected soltar(): void {
    this.el.style.translate = '';
  }
}
