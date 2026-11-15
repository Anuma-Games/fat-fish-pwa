import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { SincronizacionFacade } from '../../../application/facades/sincronizacion.facade';
import { CTA, MENU } from '../../../core/config/landing.config';
import { SonidoMesa } from '../../pages/landing/sonido-mesa';
import { PixelIcon } from '../pixel-icon/pixel-icon';

/**
 * Side menu of the whole site (README 8.3): a ☰ button in the top bar opens a panel from the left
 * with the sections of the landing page and the pages of the app, on phones and on desktop. It
 * closes with the ✕ button, the dark veil, Escape or any link.
 *
 * On the landing page the sections are anchors of the same page and the panel offers the room
 * sound. On the pages of the app the sections take the visitor back to the landing page, the link
 * of the current section is highlighted and the panel tells when the data was last synchronized.
 */
@Component({
  selector: 'app-menu-lateral',
  imports: [RouterLink, PixelIcon, DatePipe, NgTemplateOutlet],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.css',
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class MenuLateral {
  /** True on the landing page: its sections are anchors of the page itself. */
  readonly enLanding = input(false);
  /** Section of the current page (route data `seccion`); its link is highlighted. */
  readonly seccion = input<string | null>(null);

  protected readonly cta = CTA;
  protected readonly menu = MENU;
  /** Only the landing page provides the room sound. */
  protected readonly sonido = inject(SonidoMesa, { optional: true });
  protected readonly abierto = signal(false);

  /** Links to the pages of the app; the active one is the link named like the current section. */
  protected readonly enlacesApp = computed(() =>
    this.menu.app.enlaces.map((e) => ({ ...e, activo: e.texto === this.seccion() })),
  );

  private readonly injector = inject(Injector);
  /**
   * Connection state, only on the pages of the app: the landing page does not use the services of
   * the PWA, so they are looked up the first time they are needed.
   */
  protected readonly estado = computed(() =>
    this.enLanding()
      ? null
      : {
          sincronizacion: this.injector.get(SincronizacionFacade),
          swActivo: this.injector.get(SwUpdate).isEnabled,
        },
  );

  protected readonly esHoy = computed(() => {
    const fecha = this.estado()?.sincronizacion.ultimaSincronizacion();
    return !!fecha && fecha.toDateString() === new Date().toDateString();
  });

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
