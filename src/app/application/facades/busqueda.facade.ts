import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import { esSinConexion } from '../../core/http/errores-http';
import { EstadoPantalla } from '../../domain/models/estado-pantalla';
import { JugadorResumen } from '../../domain/models/jugador-resumen';
import { JugadorRepository } from '../../domain/ports/jugador.repository';
import { SincronizacionFacade } from './sincronizacion.facade';

const BUSQUEDA_MAX = 24;

/** Returns a message in Spanish when the text is longer than the API accepts, or null when it is fine. */
export function validarBusqueda(texto: string): string | null {
  return texto.length > BUSQUEDA_MAX
    ? `Escribe un ID o un alias de hasta ${BUSQUEDA_MAX} caracteres.`
    : null;
}

/**
 * Player search by alias or ID. The alias can repeat, so the result is a list: the UI shows it
 * and, when the visitor picks one, calls `HistorialFacade.buscar(jugador.jugadorId)`.
 *
 * Usage from the UI:
 *   - `buscar(texto)` on submit (or after a debounce). A new search cancels the previous one.
 *   - Paint by `estado()`: INICIAL, CARGANDO, CON_DATOS / DESDE_CACHE (list in `resultados()`),
 *     VACIO (no match), SIN_RED, ERROR (message in `error()`).
 *   - `limpiar()` returns to INICIAL.
 */
@Injectable({ providedIn: 'root' })
export class BusquedaFacade {
  private readonly repo = inject(JugadorRepository);
  private readonly sync = inject(SincronizacionFacade);

  /** Normalised text of the last search (trimmed, single spaces). */
  readonly consulta = signal('');
  readonly resultados = signal<JugadorResumen[]>([]);
  readonly estado = signal<EstadoPantalla>('INICIAL');
  /** Message in Spanish for the user; null when there is nothing to report. */
  readonly error = signal<string | null>(null);
  readonly cargando = computed(() => this.estado() === 'CARGANDO');
  private busqueda?: Subscription;

  buscar(texto: string): void {
    const consulta = texto.trim().replace(/\s+/g, ' ');
    this.busqueda?.unsubscribe();
    this.consulta.set(consulta);
    this.resultados.set([]);
    if (consulta === '') {
      this.estado.set('INICIAL');
      this.error.set(null);
      return;
    }
    const problema = validarBusqueda(consulta);
    if (problema) {
      this.estado.set('INICIAL');
      this.error.set(problema);
      return;
    }

    this.estado.set('CARGANDO');
    this.error.set(null);
    console.info(`${LOG_PREFIX} GET /api/pwa/jugadores?busqueda=${consulta}`);
    this.busqueda = this.repo.buscar(consulta).subscribe({
      next: (jugadores) => {
        this.resultados.set(jugadores);
        this.estado.set(
          jugadores.length === 0 ? 'VACIO' : this.sync.enLinea() ? 'CON_DATOS' : 'DESDE_CACHE',
        );
        this.sync.registrar();
      },
      error: (err: HttpErrorResponse) => {
        console.error(`${LOG_PREFIX} Búsqueda falló (${err.status})`, err.message);
        if (esSinConexion(err.status)) {
          this.estado.set('SIN_RED');
          this.error.set('Sin conexión. Esta búsqueda no está guardada en tu dispositivo.');
        } else {
          this.estado.set('ERROR');
          this.error.set('No pudimos buscar jugadores. Intenta de nuevo.');
        }
      },
    });
  }

  limpiar(): void {
    this.busqueda?.unsubscribe();
    this.consulta.set('');
    this.resultados.set([]);
    this.estado.set('INICIAL');
    this.error.set(null);
  }
}
