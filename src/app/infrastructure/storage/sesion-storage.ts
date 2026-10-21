import { Injectable } from '@angular/core';
import { SesionRepository } from '../../domain/ports/sesion.repository';

const JUGADOR_KEY = 'fatfish.jugadorId';
const SYNC_KEY = 'fatfish.ultimaSincronizacion';

/** Session values in localStorage. In private mode the browser may refuse; then nothing is remembered. */
@Injectable({ providedIn: 'root' })
export class SesionStorage implements SesionRepository {
  jugadorId(): string | null {
    return this.leer(JUGADOR_KEY);
  }

  guardarJugadorId(id: string): void {
    this.escribir(JUGADOR_KEY, id);
  }

  ultimaSincronizacion(): Date | null {
    const valor = this.leer(SYNC_KEY);
    return valor ? new Date(valor) : null;
  }

  guardarUltimaSincronizacion(fecha: Date): void {
    this.escribir(SYNC_KEY, fecha.toISOString());
  }

  private leer(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private escribir(key: string, valor: string): void {
    try {
      localStorage.setItem(key, valor);
    } catch {
      // Private mode: the value only lives in memory
    }
  }
}
