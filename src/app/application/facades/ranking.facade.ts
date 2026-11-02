import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, catchError, expand, take } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import { esSinConexion } from '../../core/http/errores-http';
import { EstadoPantalla } from '../../domain/models/estado-pantalla';
import { EntradaRanking, PaginaRanking } from '../../domain/models/ranking';
import { RankingRepository } from '../../domain/ports/ranking.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { SincronizacionFacade } from './sincronizacion.facade';

/** The ranking is the top 50 in pages of 10, so at most 5 pages. */
const MAX_PAGINAS = 5;

/**
 * World ranking: best victory of each player. The Service Worker keeps every page it served
 * (ngsw-config.json, group "api-ranking"); after the first page loads, this facade requests the
 * remaining pages once so the whole top 50 is also available without connection.
 *
 * Usage from the UI:
 *   - Call `cargar()` when the ranking opens and `verMas()` for the next 10 rows.
 *   - Paint by `estado()`: CARGANDO, CON_DATOS, DESDE_CACHE (no connection, saved copy: show
 *     `generadoEn()`), VACIO, SIN_RED (no connection and nothing saved), ERROR.
 *   - `miPosicion()` is the visitor's own row, only when the visitor consulted a profile before
 *     (the ID comes from the saved session); it can be outside the top 50.
 *   - When the connection returns after SIN_RED, the facade reloads by itself.
 */
@Injectable({ providedIn: 'root' })
export class RankingFacade {
  private readonly repo = inject(RankingRepository);
  private readonly sesion = inject(SesionRepository);
  private readonly sync = inject(SincronizacionFacade);

  readonly entradas = signal<EntradaRanking[]>([]);
  readonly miPosicion = signal<EntradaRanking | null>(null);
  readonly totalElementos = signal(0);
  readonly hayMas = signal(false);
  /** When the API generated the data; with DESDE_CACHE it tells how old the saved copy is. */
  readonly generadoEn = signal<Date | null>(null);
  readonly estado = signal<EstadoPantalla>('INICIAL');
  readonly cargandoMas = signal(false);
  /** Message in Spanish for the user; null when there is nothing to report. */
  readonly error = signal<string | null>(null);
  readonly enLinea = this.sync.enLinea;
  private pagina = 0;

  constructor() {
    effect(() => {
      if (this.enLinea() && untracked(() => this.estado()) === 'SIN_RED') {
        untracked(() => this.cargar());
      }
    });
  }

  /** Loads the first page again from zero (also the "Reintentar" button). */
  cargar(): void {
    const jugadorId = this.jugadorId();
    this.pagina = 0;
    this.estado.set('CARGANDO');
    this.error.set(null);
    console.info(`${LOG_PREFIX} GET /api/pwa/ranking?pagina=0${this.sufijo(jugadorId)}`);
    this.repo.pagina(0, jugadorId).subscribe({
      next: (pagina) => {
        this.entradas.set(pagina.contenido);
        this.aplicar(pagina);
        this.estado.set(this.estadoConDatos(pagina));
        this.sync.registrar();
        this.precargarRestantes(jugadorId);
      },
      error: (err: HttpErrorResponse) => {
        console.error(`${LOG_PREFIX} GET ranking falló (${err.status})`, err.message);
        this.entradas.set([]);
        this.miPosicion.set(null);
        this.hayMas.set(false);
        if (esSinConexion(err.status)) {
          this.estado.set('SIN_RED');
          this.error.set('Sin conexión y todavía no hay un ranking guardado en tu dispositivo.');
        } else {
          this.estado.set('ERROR');
          this.error.set('No pudimos consultar el ranking. Intenta de nuevo.');
        }
      },
    });
  }

  /** Appends the next page ("Ver más"). On failure the rows already shown stay as they are. */
  verMas(): void {
    if (!this.hayMas() || this.cargandoMas()) return;
    const siguiente = this.pagina + 1;
    const jugadorId = this.jugadorId();
    this.cargandoMas.set(true);
    this.error.set(null);
    console.info(`${LOG_PREFIX} GET /api/pwa/ranking?pagina=${siguiente}${this.sufijo(jugadorId)}`);
    this.repo.pagina(siguiente, jugadorId).subscribe({
      next: (pagina) => {
        this.pagina = siguiente;
        this.entradas.update((actuales) => [...actuales, ...pagina.contenido]);
        this.aplicar(pagina);
        this.cargandoMas.set(false);
        this.sync.registrar();
      },
      error: (err: HttpErrorResponse) => {
        console.error(`${LOG_PREFIX} GET ranking página ${siguiente} falló (${err.status})`);
        this.error.set(
          esSinConexion(err.status)
            ? 'Sin conexión: esta parte del ranking no está guardada en tu dispositivo.'
            : 'No pudimos cargar más posiciones. Intenta de nuevo.',
        );
        this.cargandoMas.set(false);
      },
    });
  }

  private aplicar(pagina: PaginaRanking): void {
    this.miPosicion.set(pagina.miPosicion);
    this.totalElementos.set(pagina.totalElementos);
    this.hayMas.set(!pagina.ultima);
    this.generadoEn.set(pagina.generadoEn);
  }

  private estadoConDatos(pagina: PaginaRanking): EstadoPantalla {
    if (pagina.contenido.length === 0) return 'VACIO';
    return this.enLinea() ? 'CON_DATOS' : 'DESDE_CACHE';
  }

  /** Requests pages 1..4 one after another, only to leave them in the Service Worker cache. */
  private precargarRestantes(jugadorId: string | null): void {
    if (!this.enLinea() || !this.hayMas()) return;
    this.repo
      .pagina(1, jugadorId)
      .pipe(
        expand((pagina) =>
          pagina.ultima ? EMPTY : this.repo.pagina(pagina.pagina + 1, jugadorId),
        ),
        take(MAX_PAGINAS - 1),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  /** Numeric ID saved by the last profile consult, or null when the visitor has not consulted one. */
  private jugadorId(): string | null {
    const guardado = this.sesion.jugadorId();
    return guardado && /^\d+$/.test(guardado) ? guardado : null;
  }

  private sufijo(jugadorId: string | null): string {
    return jugadorId ? `&jugadorId=${jugadorId}` : '';
  }
}