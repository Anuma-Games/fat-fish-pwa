import { Component } from '@angular/core';
import { COMODINES } from '../../../../../core/config/landing.config';
import { prefiereMenosMovimiento } from '../../motion';
import { Foco } from '../../foco.directive';
import { Reveal } from '../../reveal.directive';

/** The four wildcards of the MVP as cards that lean toward the pointer. */
@Component({
  selector: 'app-landing-comodines',
  imports: [Reveal, Foco],
  templateUrl: './comodines.section.html',
  styleUrl: './comodines.section.css',
})
export class ComodinesSection {
  protected readonly comodines = COMODINES;
  private readonly quieto = prefiereMenosMovimiento();

  protected inclinar(evento: PointerEvent): void {
    if (this.quieto || evento.pointerType === 'touch') return;
    const carta = evento.currentTarget as HTMLElement;
    const caja = carta.getBoundingClientRect();
    const x = (evento.clientX - caja.left) / caja.width;
    const y = (evento.clientY - caja.top) / caja.height;
    carta.style.transform = `rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg)`;
    carta.style.setProperty('--bx', `${x * 100}%`);
    carta.style.setProperty('--by', `${y * 100}%`);
  }

  protected soltar(evento: PointerEvent): void {
    (evento.currentTarget as HTMLElement).style.transform = '';
  }
}
