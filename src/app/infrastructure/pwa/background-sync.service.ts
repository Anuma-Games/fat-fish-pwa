import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { LOG_PREFIX } from '../../core/config/api.config';
import { SegundoPlano } from '../../domain/ports/segundo-plano';

/** Tag of the `sync` event; public/sw.js empties the outbox when it receives it. */
export const TAG_OUTBOX = 'fatfish-outbox';

/** What Background Sync adds to the registration (it is not in the DOM types yet). */
interface RegistroConSync extends ServiceWorkerRegistration {
  sync?: { register(tag: string): Promise<void> };
}

/**
 * Background Sync (README 7.4): registers `fatfish-outbox` so the service worker sends the outbox
 * when the network returns, with the tab closed. Only Chromium browsers support it; in Safari and
 * Firefox, or without the service worker (ng serve), it does nothing.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundSyncService implements SegundoPlano {
  private readonly swActivo = inject(SwUpdate, { optional: true })?.isEnabled ?? false;

  programarEnvio(): void {
    if (!this.swActivo || !('SyncManager' in window)) return;
    navigator.serviceWorker.ready
      .then((registro: RegistroConSync) => registro.sync?.register(TAG_OUTBOX))
      .then(() => console.info(`${LOG_PREFIX} Background Sync registrado (${TAG_OUTBOX})`))
      .catch((err: unknown) =>
        // Without permission the outbox still empties when the app opens or reconnects
        console.warn(`${LOG_PREFIX} No se pudo registrar Background Sync`, err),
      );
  }
}
