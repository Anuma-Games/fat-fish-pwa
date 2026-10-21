import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { LAB_PLAYER_ID, LOG_PREFIX } from '../../core/config/api.config';
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
  /** Moment the last GET started; the page uses it to log the render time. */
  inicioConsulta = 0;
  private jugadorId = '';
  private pagina = 0;

  /** Player consulted last time; ignores ids saved by older versions of the lab (UUIDs). */
  idGuardado(): string {
    const guardado = this.sesion.jugadorId();
    return guardado && /^\d+$/.test(guardado) ? guardado : LAB_PLAYER_ID;
  }

  buscar(jugadorId: string): void {
    this.sesion.guardarJugadorId(jugadorId);
    this.jugadorId = jugadorId;
    this.pagina = 0;
    this.cargando.set(true);
    this.error.set(null);
    this.inicioConsulta = performance.now();
    console.info(`${LOG_PREFIX} GET /api/pwa/perfil?id=${jugadorId}`);
    console.info(
      `${LOG_PREFIX} GET /api/pwa/partidas?id=${jugadorId}&pagina=0&tamano=${TAMANO_PAGINA}`,
    );
    forkJoin({
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
        this.error.set(
          err.status === 404 || err.status === 400
            ? 'No encontramos a ningún jugador con ese alias o ID. En el laboratorio, los jugadores 1 a 5 se crean con sql/02_carga.sql.'
            : 'No pudimos consultar tu expediente y no hay una copia guardada sin conexión. Intenta de nuevo cuando vuelva la red.',
        );
        this.cargando.set(false);
      },
    });
  }

  verMas(): void {
    const siguiente = this.pagina + 1;
    this.cargandoMas.set(true);
    this.inicioConsulta = performance.now();
    console.info(
      `${LOG_PREFIX} GET /api/pwa/partidas?id=${this.jugadorId}&pagina=${siguiente}&tamano=${TAMANO_PAGINA}`,
    );
    this.partidasRepo.historial(this.jugadorId, siguiente, TAMANO_PAGINA).subscribe({
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
