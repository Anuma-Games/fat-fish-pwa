import { Injectable, signal } from '@angular/core';

const KEY = 'fatfish.ultimaSincronizacion';

/** Last time the PWA exchanged data with the API while online (shown in the menu). */
@Injectable({ providedIn: 'root' })
export class SyncStatusService {
  readonly ultimaSincronizacion = signal<Date | null>(this.leer());

  registrar(): void {
    if (!navigator.onLine) return;
    const ahora = new Date();
    this.ultimaSincronizacion.set(ahora);
    try {
      localStorage.setItem(KEY, ahora.toISOString());
    } catch {
      // Private mode: the value only lives in memory
    }
  }

  private leer(): Date | null {
    try {
      const valor = localStorage.getItem(KEY);
      return valor ? new Date(valor) : null;
    } catch {
      return null;
    }
  }
}
