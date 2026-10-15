import { Injectable, signal } from '@angular/core';
import { LOG_PREFIX } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  readonly enLinea = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => {
      console.info(`${LOG_PREFIX} Conexión recuperada`);
      this.enLinea.set(true);
    });
    window.addEventListener('offline', () => {
      console.warn(`${LOG_PREFIX} Sin conexión: los envíos se guardarán en IndexedDB`);
      this.enLinea.set(false);
    });
  }
}
