import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Pagina, Partida } from '../../domain/models/partida';
import { Perfil } from '../../domain/models/perfil';
import { Conectividad } from '../../domain/ports/conectividad';
import { PartidaRepository } from '../../domain/ports/partida.repository';
import { PerfilRepository } from '../../domain/ports/perfil.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { ConectividadFalsa, SesionFalsa } from '../../testing/fakes';
import { HistorialFacade } from './historial.facade';

const generadoEn = new Date('2026-10-15T00:00:00Z');

const perfil = (jugadorId: string): Perfil => ({
  jugadorId,
  alias: `jugador${jugadorId}`,
  creadoEn: generadoEn,
  ultimaActividad: null,
  estadisticas: {
    partidasTotales: 20,
    partidasGanadas: 5,
    totalInvertido: 0,
    totalPerdido: 0,
    rachaDerrotasMax: 0,
    tiempoJugadoSeg: 0,
  },
  generadoEn,
});

const pagina = (jugadorId: string, numero: number, ultima = false): Pagina<Partida> => ({
  contenido: [
    {
      id: `${jugadorId}-${numero}`,
      resultado: 'DERROTA',
      rondaAlcanzada: 3,
      puntaje: 100,
      dineroInvertido: 0,
      dineroGanado: 0,
      dineroPerdido: 0,
      duracionSeg: 60,
      creadaEn: generadoEn,
    },
  ],
  pagina: numero,
  tamano: 10,
  totalElementos: 20,
  ultima,
  generadoEn,
});

describe('HistorialFacade', () => {
  /** Answers still on their way, by "id" (profile) or "id/page" (runs). */
  let perfiles: Map<string, Subject<Perfil>>;
  let paginas: Map<string, Subject<Pagina<Partida>>>;
  let facade: HistorialFacade;
  let sesion: SesionFalsa;

  const enCamino = <T>(mapa: Map<string, Subject<T>>, clave: string) => {
    const respuesta = new Subject<T>();
    mapa.set(clave, respuesta);
    return respuesta;
  };

  function responder(jugadorId: string): void {
    const p = perfiles.get(jugadorId)!;
    const h = paginas.get(`${jugadorId}/0`)!;
    p.next(perfil(jugadorId));
    p.complete();
    h.next(pagina(jugadorId, 0));
    h.complete();
  }

  beforeEach(() => {
    perfiles = new Map();
    paginas = new Map();
    sesion = new SesionFalsa();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PerfilRepository,
          useValue: { perfil: (id: string) => enCamino(perfiles, id) },
        },
        {
          provide: PartidaRepository,
          useValue: {
            historial: (id: string, n: number) => enCamino(paginas, `${id}/${n}`),
          },
        },
        { provide: Conectividad, useValue: new ConectividadFalsa() },
        { provide: SesionRepository, useValue: sesion },
      ],
    });
    facade = TestBed.inject(HistorialFacade);
  });

  it('keeps the dossier of the last player when the previous answer arrives late', () => {
    facade.buscar('1');
    facade.buscar('1042');
    responder('1042');
    responder('1');
    expect(facade.perfil()?.jugadorId).toBe('1042');
    expect(facade.partidas().map((p) => p.id)).toEqual(['1042-0']);
    expect(facade.cargando()).toBe(false);
  });

  it('does not add the next page of the previous player to the new one', () => {
    facade.buscar('1');
    responder('1');
    facade.verMas();
    facade.buscar('1042');
    responder('1042');
    paginas.get('1/1')!.next(pagina('1', 1, true));
    expect(facade.partidas().map((p) => p.id)).toEqual(['1042-0']);
    expect(facade.hayMas()).toBe(true);
    expect(facade.cargandoMas()).toBe(false);
  });

  it('forgets a saved player that no longer exists, without an error message', () => {
    facade.buscar('77');
    expect(sesion.id).toBe('77');
    perfiles.get('77')!.error(new HttpErrorResponse({ status: 404 }));
    expect(sesion.id).toBeNull();
    expect(facade.jugadorGuardado()).toBeNull();
    expect(facade.jugadorNoEncontrado()).toBe(true);
    expect(facade.error()).toBeNull();
    expect(facade.cargando()).toBe(false);
  });

  it('keeps the saved player and explains it when the server fails for another reason', () => {
    facade.buscar('6');
    perfiles.get('6')!.error(new HttpErrorResponse({ status: 0 }));
    expect(sesion.id).toBe('6');
    expect(facade.jugadorNoEncontrado()).toBe(false);
    expect(facade.error()).toContain('No pudimos consultar tu expediente');
    expect(facade.error()).not.toMatch(/laboratorio|02_carga/);
  });

  it('tells whose dossier is on its way', () => {
    facade.buscar('1042');
    expect(facade.consultando('1042')).toBe(true);
    expect(facade.consultando('1')).toBe(false);
    responder('1042');
    expect(facade.consultando('1042')).toBe(false);
  });
});
