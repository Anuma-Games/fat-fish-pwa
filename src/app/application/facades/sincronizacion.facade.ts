import { Injectable, inject, signal } from '@angular/core';
import { Conectividad } from '../../domain/ports/conectividad';
import { SesionRepository } from '../../domain/ports/sesion.repository';

/** Connection state and the last time the PWA exchanged data with the API (shown in the menu). */
@Injectable({ providedIn: 'root' })
export class SincronizacionFacade {
  private readonly sesion = inject(SesionRepository);

  readonly enLinea = inject(Conectividad).enLinea;
  readonly ultimaSincronizacion = signal<Date | null>(this.sesion.ultimaSincronizacion());

  registrar(): void {
    if (!this.enLinea()) return;
    const ahora = new Date();
    this.ultimaSincronizacion.set(ahora);
    this.sesion.guardarUltimaSincronizacion(ahora);
  }
}
