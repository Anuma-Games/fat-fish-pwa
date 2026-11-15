import { Component, Injector, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SincronizacionFacade } from '../../../application/facades/sincronizacion.facade';
import { CTA, MENU } from '../../../core/config/landing.config';
import { MenuLateral } from '../menu-lateral/menu-lateral';

/** Sections of the landing page that fit in the bar on desktop; the side menu has all of them. */
const EN_LA_BARRA = ['como-se-juega', 'comodines', 'faq'];

/**
 * Top bar of the whole site (README 8.3): ☰ with the side menu, the brand, the links to the
 * sections of the landing page and to the pages of the app (desktop only) and the demo.
 *
 * The landing page projects its room sound (`.sonido`) and its reading progress (`.progreso`).
 * On the pages of the app the link of the current section is highlighted and a chip tells when
 * there is no connection.
 */
@Component({
  selector: 'app-barra-nav',
  imports: [RouterLink, MenuLateral],
  templateUrl: './barra-nav.html',
  styleUrl: './barra-nav.css',
})
export class BarraNav {
  /** True on the landing page: its sections are anchors of the page itself. */
  readonly enLanding = input(false);
  /** Section of the current page (route data `seccion`); its link is highlighted. */
  readonly seccion = input<string | null>(null);

  protected readonly cta = CTA;
  private readonly injector = inject(Injector);
  /** Connection state, only on the pages of the app (the landing page does not use it). */
  protected readonly sincronizacion = computed(() =>
    this.enLanding() ? null : this.injector.get(SincronizacionFacade),
  );
  protected readonly secciones = MENU.mesa.enlaces.filter((e) => EN_LA_BARRA.includes(e.id));
  protected readonly paginas = computed(() =>
    MENU.app.enlaces.map((e) => ({ ...e, activo: e.texto === this.seccion() })),
  );
}
