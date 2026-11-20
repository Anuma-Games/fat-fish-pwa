import { ViewportScroller } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { EncuestaFacade } from './application/facades/encuesta.facade';
import { RetroalimentacionFacade } from './application/facades/retroalimentacion.facade';
import { LOG_PREFIX } from './core/config/api.config';
import { AvisoVersion } from './presentation/components/aviso-version/aviso-version';
import { BarraNav } from './presentation/components/barra-nav/barra-nav';

@Component({
  imports: [RouterOutlet, BarraNav, AvisoVersion],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly swActivo = inject(SwUpdate).isEnabled;

  private readonly route = inject(ActivatedRoute);
  /** Layout of the current route: the landing page takes the whole window and brings its own bar. */
  protected readonly esLanding = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.datos()['layout'] === 'landing'),
    ),
    { initialValue: this.datos()['layout'] === 'landing' },
  );
  /** Section of the current page (route data `seccion`), highlighted in the top bar and the menu. */
  protected readonly seccion = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => (this.datos()['seccion'] as string | undefined) ?? null),
    ),
    { initialValue: null },
  );

  constructor() {
    // Links to a section of the landing page (/#comodines) leave it below the sticky nav
    inject(ViewportScroller).setOffset([0, 64]);
    // The facades send what was saved offline when the connection returns. Angular only creates them when
    // a page injects them, so without this a message waited until the visitor opened Opinión again.
    inject(RetroalimentacionFacade);
    inject(EncuestaFacade);
    console.info(
      `${LOG_PREFIX} PWA iniciada · service worker ${this.swActivo ? 'activo' : 'inactivo (modo desarrollo)'} · ${navigator.onLine ? 'en línea' : 'sin conexión'}`,
    );
  }

  /** Data of the deepest active route. */
  private datos(): Record<string, unknown> {
    let r = this.route;
    while (r.firstChild) r = r.firstChild;
    return r.snapshot.data as Record<string, unknown>;
  }
}
