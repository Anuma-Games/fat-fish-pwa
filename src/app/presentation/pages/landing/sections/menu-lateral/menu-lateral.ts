import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CTA } from '../../../../../core/config/landing.config';
import { PixelIcon } from '../../../../components/pixel-icon/pixel-icon';
import { SonidoMesa } from '../../sonido-mesa';

/**
 * Side menu of the landing page on phones, like the drawer of the PWA: a ☰ button in the nav opens
 * a panel from the left with the sections, the links to the PWA, the sound and the demo. It closes
 * with the ✕ button, the dark veil, Escape or any link. From 1024 px (desktop) it is not shown.
 */
@Component({
  selector: 'app-landing-menu-lateral',
  imports: [RouterLink, PixelIcon],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.css',
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class MenuLateral {
  protected readonly cta = CTA;
  protected readonly sonido = inject(SonidoMesa);
  protected readonly abierto = signal(false);

  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private readonly cerrarBoton = viewChild.required<ElementRef<HTMLButtonElement>>('cerrarBoton');

  constructor() {
    // The page behind does not scroll while the panel is open
    effect(() => {
      document.documentElement.style.overflow = this.abierto() ? 'hidden' : '';
    });
    inject(DestroyRef).onDestroy(() => (document.documentElement.style.overflow = ''));
  }

  protected abrir(): void {
    this.abierto.set(true);
    // Once the panel is interactive, focus goes to its close button
    setTimeout(() => this.cerrarBoton().nativeElement.focus());
  }

  /** Keeps Tab inside the open panel: from the last control back to the first, and the reverse. */
  protected atrapar(e: Event): void {
    const evento = e as KeyboardEvent;
    const panel = evento.currentTarget as HTMLElement;
    const controles = [...panel.querySelectorAll<HTMLElement>('a[href], button')];
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  protected cerrar(): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    const enPanel = document.activeElement?.closest('.panel');
    if (enPanel) this.boton().nativeElement.focus({ preventScroll: true });
  }
}
