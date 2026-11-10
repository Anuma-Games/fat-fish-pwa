import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { LOG_PREFIX } from '../../core/config/api.config';
import { Partida } from '../../domain/models/partida';
import { Perfil } from '../../domain/models/perfil';
import { PartidaRepository } from '../../domain/ports/partida.repository';
import { PerfilRepository } from '../../domain/ports/perfil.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { SincronizacionFacade } from './sincronizacion.facade';

const TAMANO_PAGINA = 10;

/** Expediente: profile with statistics plus the run history, 10 runs per page ("Ver más partidas"). */
@Injectable({ providedIn: 'root' })
export class HistorialFacade {
  private readonly partidasRepo = inject(PartidaRepository);
  private readonly perfilRepo = inject(PerfilRepository);
  private readonly sesion = inject(SesionRepository);
  private readonly sync = inject(SincronizacionFacade);

  readonly perfil = signal<Perfil | null>(null);
  readonly partidas = signal<Partida[]>([]);
  readonly totalPartidas = signal(0);
  readonly hayMas = signal(false);
  readonly generadoEn = signal<Date | null>(null);
  readonly cargando = signal(false);
  readonly cargandoMas = signal(false);
  readonly error = signal<string | null>(null);
  /**
   * True when the server no longer knows the player (404/400). The saved ID is already forgotten;
   * the page sends the visitor to the search at /acceso (the facade does not navigate).
   */
  readonly jugadorNoEncontrado = signal(false);
  /** Moment the last GET started; the page uses it to log the render time. */
  inicioConsulta = 0;
  private jugadorId = '';
  private pagina = 0;
  /** Requests of the current player (profile, first page and "Ver más"); a new search cancels them. */
  private peticiones = new Subscription();

  /**
   * Player consulted last time, or null when the visitor has not looked up anyone yet (then the
   * dossier sends them to the search at /acceso). Ignores ids saved by older versions of the lab
   * (UUIDs).
   */
  jugadorGuardado(): string | null {
    const guardado = this.sesion.jugadorId();
    return guardado && /^\d+$/.test(guardado) ? guardado : null;
  }

  /** True while the dossier of `jugadorId` is on its way. */
  consultando(jugadorId: string): boolean {
    return this.cargando() && this.jugadorId === jugadorId;
  }

  buscar(jugadorId: string): void {
    // A slower answer for the previous player must not replace this one
    this.peticiones.unsubscribe();
    this.peticiones = new Subscription();
    this.cargandoMas.set(false);
    this.sesion.guardarJugadorId(jugadorId);
    this.jugadorId = jugadorId;
    this.pagina = 0;
    this.cargando.set(true);
    this.error.set(null);
    this.jugadorNoEncontrado.set(false);
    this.inicioConsulta = performance.now();
    console.info(`${LOG_PREFIX} GET /api/pwa/perfil?id=${jugadorId}`);
    console.info(
      `${LOG_PREFIX} GET /api/pwa/partidas?id=${jugadorId}&pagina=0&tamano=${TAMANO_PAGINA}`,
    );
    const consulta = forkJoin({
      perfil: this.perfilRepo.perfil(jugadorId),
      pagina: this.partidasRepo.historial(jugadorId, 0, TAMANO_PAGINA),
    }).subscribe({
      next: ({ perfil, pagina }) => {
        console.info(
          `${LOG_PREFIX} Perfil y partidas respondieron en ${this.ms()} ms: ${perfil.alias} (ID #${perfil.jugadorId}), ${pagina.contenido.length} de ${pagina.totalElementos} partidas`,
        );
        this.tabla(pagina.contenido);
        this.perfil.set(perfil);
        this.partidas.set(pagina.contenido);
        this.totalPartidas.set(pagina.totalElementos);
        this.hayMas.set(!pagina.ultima);
        this.generadoEn.set(pagina.generadoEn);
        this.cargando.set(false);
        this.sync.registrar();
      },
      error: (err: HttpErrorResponse) => {
        console.error(`${LOG_PREFIX} GET falló (${err.status})`, err.message);
        this.perfil.set(null);
        this.partidas.set([]);
        if (err.status === 404 || err.status === 400) {
          // The saved player no longer exists (for example, after the data was cleaned)
          this.sesion.olvidarJugadorId();
          this.jugadorNoEncontrado.set(true);
        } else {
          this.error.set(
            'No pudimos consultar tu expediente y no hay una copia guardada sin conexión. Intenta de nuevo cuando vuelva la red.',
          );
        }
        this.cargando.set(false);
      },
    });
    this.peticiones.add(consulta);
  }

  verMas(): void {
    const siguiente = this.pagina + 1;
    this.cargandoMas.set(true);
    this.inicioConsulta = performance.now();
    console.info(
      `${LOG_PREFIX} GET /api/pwa/partidas?id=${this.jugadorId}&pagina=${siguiente}&tamano=${TAMANO_PAGINA}`,
    );
    const pagina = this.partidasRepo.historial(this.jugadorId, siguiente, TAMANO_PAGINA).subscribe({
      next: (pagina) => {
        console.info(
          `${LOG_PREFIX} Página ${siguiente} respondió en ${this.ms()} ms: ${pagina.contenido.length} partidas más`,
        );
        this.tabla(pagina.contenido);
        this.pagina = siguiente;
        this.partidas.update((actuales) => [...actuales, ...pagina.contenido]);
        this.hayMas.set(!pagina.ultima);
        this.cargandoMas.set(false);
        this.sync.registrar();
      },
      error: (err: HttpErrorResponse) => {
        console.error(
          `${LOG_PREFIX} GET de la página ${siguiente} falló (${err.status})`,
          err.message,
        );
        this.cargandoMas.set(false);
      },
    });
    this.peticiones.add(pagina);
  }

  private ms(): string {
    return (performance.now() - this.inicioConsulta).toFixed(1);
  }

  private tabla(partidas: Partida[]): void {
    console.table(
      partidas.map((p) => ({
        fecha: p.creadaEn.toISOString(),
        resultado: p.resultado,
        ronda: p.rondaAlcanzada,
        puntaje: p.puntaje,
      })),
    );
  }
}
