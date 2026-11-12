import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, Subscription, catchError, expand, take } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import { esSinConexion } from '../../core/http/errores-http';
import { EstadoPantalla } from '../../domain/models/estado-pantalla';
import { EntradaRanking, PaginaRanking } from '../../domain/models/ranking';
import { PerfilRepository } from '../../domain/ports/perfil.repository';
import { RankingRepository } from '../../domain/ports/ranking.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { SincronizacionFacade } from './sincronizacion.facade';

/** The ranking is the top 50 in pages of 10, so at most 5 pages. */
const MAX_PAGINAS = 5;
const TAMANO_PAGINA = 10;

/**
 * World ranking: best victory of each player. The Service Worker keeps every page it served
 * (ngsw-config.json, group "api-ranking"); after the first page loads, this facade requests the
 * remaining pages once so the whole top 50 is also available without connection.
 *
 * Usage from the UI:
 *   - Call `cargar()` when the ranking opens. Then either `irAPagina(n)` to show page n alone
 *     (numbered pager, `paginaActual()` of `totalPaginas()`) or `verMas()` to append the next 10.
 *   - Paint by `estado()`: CARGANDO, CON_DATOS, DESDE_CACHE (no connection, saved copy: show
 *     `generadoEn()`), VACIO, SIN_RED (no connection and nothing saved), ERROR.
 *   - `miPosicion()` is the visitor's own row, only when the visitor consulted a profile before
 *     (the ID comes from the saved session); it can be outside the top 50. When it is null,
 *     `consultoExpediente()` tells "no profile consulted" apart from "player without victories".
 *   - When the connection returns after SIN_RED or DESDE_CACHE, the facade reloads by itself.
 *   - When the API sends no `miPosicion` for a saved player, the facade asks the profile (the
 *     Service Worker also keeps that answer) to tell a player without victories apart from one
 *     that no longer exists. If the server answers 404/400, the saved ID is forgotten and
 *     `consultoExpediente()` turns false, so the page invites to look the profile up again.
 *     Without connection (or on a server failure) the ID is kept.
 */
@Injectable({ providedIn: 'root' })
export class RankingFacade {
  private readonly repo = inject(RankingRepository);
  private readonly perfilRepo = inject(PerfilRepository);
  private readonly sesion = inject(SesionRepository);
  private readonly sync = inject(SincronizacionFacade);

  readonly entradas = signal<EntradaRanking[]>([]);
  readonly miPosicion = signal<EntradaRanking | null>(null);
  /**
   * True when the visitor consulted a profile before and that player still exists. With
   * `miPosicion()` null it means that player has no victories yet (the API only ranks won
   * games). It turns false when the server says the saved player no longer exists.
   */
  readonly consultoExpediente = signal(false);
  readonly totalElementos = signal(0);
  readonly hayMas = signal(false);
  /** When the API generated the data; with DESDE_CACHE it tells how old the saved copy is. */
  readonly generadoEn = signal<Date | null>(null);
  readonly estado = signal<EstadoPantalla>('INICIAL');
  readonly cargandoMas = signal(false);
  /** Page shown by `irAPagina` (0-based); `cargar()` goes back to 0. */
  readonly paginaActual = signal(0);
  /** Pages of the top 50 that exist (at most 5). */
  readonly totalPaginas = computed(() =>
    Math.min(MAX_PAGINAS, Math.ceil(this.totalElementos() / TAMANO_PAGINA)),
  );
  /** Message in Spanish for the user; null when there is nothing to report. */
  readonly error = signal<string | null>(null);
  readonly enLinea = this.sync.enLinea;
  private pagina = 0;
  /** Requests of the current load (first page, prefetch and "Ver más"); a new load cancels them. */
  private peticiones = new Subscription();

  constructor() {
    effect(() => {
      if (!this.enLinea()) return;
      untracked(() => {
        // Back online: replace the saved copy (or the "no connection" notice) with fresh data
        if (this.estado() === 'SIN_RED') this.cargar();
        else if (this.estado() === 'DESDE_CACHE') this.mostrarPagina(this.paginaActual());
      });
    });
  }

  /** Loads the first page again from zero (also the "Reintentar" button). */
  cargar(): void {
    const jugadorId = this.jugadorId();
    this.consultoExpediente.set(jugadorId !== null);
    this.peticiones.unsubscribe();
    this.peticiones = new Subscription();
    this.pagina = 0;
    this.paginaActual.set(0);
    this.cargandoMas.set(false);
    this.estado.set('CARGANDO');
    this.error.set(null);
    console.info(`${LOG_PREFIX} GET /api/pwa/ranking?pagina=0${this.sufijo(jugadorId)}`);
    const primera = this.repo.pagina(0, jugadorId).subscribe({
      next: (pagina) => {
        this.entradas.set(pagina.contenido);
        this.aplicar(pagina);
        this.estado.set(this.estadoConDatos(pagina));
        this.sync.registrar();
        this.precargarRestantes(jugadorId);
        this.confirmarJugador(jugadorId, pagina.miPosicion);
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
    this.peticiones.add(primera);
  }

  /** Appends the next page ("Ver más"). On failure the rows already shown stay as they are. */
  verMas(): void {
    if (!this.hayMas() || this.cargandoMas()) return;
    const siguiente = this.pagina + 1;
    const jugadorId = this.jugadorId();
    this.cargandoMas.set(true);
    this.error.set(null);
    console.info(`${LOG_PREFIX} GET /api/pwa/ranking?pagina=${siguiente}${this.sufijo(jugadorId)}`);
    const siguientePagina = this.repo.pagina(siguiente, jugadorId).subscribe({
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
    this.peticiones.add(siguientePagina);
  }

  /**
   * Shows page `numero` (0-based) in place of the current rows (numbered pager). Without
   * connection the Service Worker answers with the saved copy; if that page is not saved, the
   * rows already shown stay and `error()` explains it.
   */
  irAPagina(numero: number): void {
    if (numero < 0 || numero >= this.totalPaginas() || this.cargandoMas()) return;
    if (numero === this.paginaActual() && this.entradas().length > 0) return;
    this.mostrarPagina(numero);
  }

  private mostrarPagina(numero: number): void {
    const jugadorId = this.jugadorId();
    this.cargandoMas.set(true);
    this.error.set(null);
    console.info(`${LOG_PREFIX} GET /api/pwa/ranking?pagina=${numero}${this.sufijo(jugadorId)}`);
    const peticion = this.repo.pagina(numero, jugadorId).subscribe({
      next: (pagina) => {
        this.pagina = numero;
        this.paginaActual.set(numero);
        this.entradas.set(pagina.contenido);
        this.aplicar(pagina);
        this.estado.set(this.estadoConDatos(pagina));
        this.cargandoMas.set(false);
        this.sync.registrar();
      },
      error: (err: HttpErrorResponse) => {
        console.error(`${LOG_PREFIX} GET ranking página ${numero} falló (${err.status})`);
        this.error.set(
          esSinConexion(err.status)
            ? 'Sin conexión: esa página del ranking no está guardada en tu dispositivo.'
            : 'No pudimos cargar esa página del ranking. Intenta de nuevo.',
        );
        this.cargandoMas.set(false);
      },
    });
    this.peticiones.add(peticion);
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
    const precarga = this.repo
      .pagina(1, jugadorId)
      .pipe(
        expand((pagina) =>
          pagina.ultima ? EMPTY : this.repo.pagina(pagina.pagina + 1, jugadorId),
        ),
        take(MAX_PAGINAS - 1),
        catchError(() => EMPTY),
      )
      .subscribe();
    this.peticiones.add(precarga);
  }

  /**
   * The ranking answers `miPosicion` null both for a player without victories and for one that
   * does not exist, so the profile settles it. Only a 404/400 from the server forgets the ID:
   * without connection (0/504) or on a server failure the player may still exist.
   */
  private confirmarJugador(jugadorId: string | null, miPosicion: EntradaRanking | null): void {
    if (jugadorId === null || miPosicion !== null) return;
    console.info(`${LOG_PREFIX} GET /api/pwa/perfil?id=${jugadorId} (el ranking no lo ubicó)`);
    const consulta = this.perfilRepo.perfil(jugadorId).subscribe({
      error: (err: HttpErrorResponse) => {
        console.error(`${LOG_PREFIX} GET perfil desde el ranking falló (${err.status})`);
        if (err.status !== 404 && err.status !== 400) return;
        // The visitor may have looked up another player while this answer was on its way
        if (this.sesion.jugadorId() !== jugadorId) return;
        this.sesion.olvidarJugadorId();
        this.consultoExpediente.set(false);
      },
    });
    this.peticiones.add(consulta);
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