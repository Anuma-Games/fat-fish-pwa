import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { LOG_PREFIX } from './core/config/api.config';
import { ConnectivityService } from './infrastructure/pwa/connectivity.service';
import { SyncStatusService } from './infrastructure/pwa/sync-status.service';
import { PixelIcon } from './presentation/components/pixel-icon/pixel-icon';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, PixelIcon],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly conectividad = inject(ConnectivityService);
  protected readonly sync = inject(SyncStatusService);
  protected readonly swActivo = signal(inject(SwUpdate).isEnabled);
  protected readonly menuAbierto = signal(false);

  private readonly route = inject(ActivatedRoute);
  /** Layout of the current route: the landing page takes the whole window, without the app shell. */
  protected readonly esLanding = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.datos()['layout'] === 'landing'),
    ),
    { initialValue: this.datos()['layout'] === 'landing' },
  );
  /** Title of the current section for the phone top bar (route data `seccion`). */
  protected readonly seccion = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.datos()['seccion'] ?? 'Fat Fish'),
    ),
    { initialValue: 'Fat Fish' },
  );

  protected readonly esHoy = computed(() => {
    const fecha = this.sync.ultimaSincronizacion();
    return !!fecha && fecha.toDateString() === new Date().toDateString();
  });

  constructor() {
    console.info(
      `${LOG_PREFIX} PWA iniciada · service worker ${this.swActivo() ? 'activo' : 'inactivo (modo desarrollo)'} · ${navigator.onLine ? 'en línea' : 'sin conexión'}`,
    );
  }

  /** Data of the deepest active route. */
  private datos(): Record<string, unknown> {
    let r = this.route;
    while (r.firstChild) r = r.firstChild;
    return r.snapshot.data as Record<string, unknown>;
  }
}
