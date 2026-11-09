import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { EntradaRanking, PaginaRanking } from '../../domain/models/ranking';
import { Conectividad } from '../../domain/ports/conectividad';
import { RankingRepository } from '../../domain/ports/ranking.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { ConectividadFalsa, SesionFalsa } from '../../testing/fakes';
import { RankingFacade } from './ranking.facade';

const fila = (posicion: number): EntradaRanking => ({
  posicion,
  jugadorId: String(posicion),
  alias: `jugador${posicion}`,
  puntaje: 2000 - posicion,
  logradoEn: new Date('2026-10-13T22:00:00Z'),
});

function pagina(numero: number, ultima = false, miPosicion: EntradaRanking | null = null) {
  const base = numero * 10;
  return {
    contenido: Array.from({ length: 10 }, (_, i) => fila(base + i + 1)),
    pagina: numero,
    tamano: 10,
    totalElementos: 50,
    ultima,
    miPosicion,
    generadoEn: new Date('2026-10-15T00:00:00Z'),
  } satisfies PaginaRanking;
}

describe('RankingFacade', () => {
  let pedidas: { pagina: number; jugadorId: string | null }[];
  let responder: (pagina: number) => Observable<PaginaRanking>;
  let conectividad: ConectividadFalsa;
  let sesion: SesionFalsa;
  let facade: RankingFacade;

  beforeEach(() => {
    pedidas = [];
    responder = (n) => of(pagina(n, n === 4));
    conectividad = new ConectividadFalsa();
    sesion = new SesionFalsa();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RankingRepository,
          useValue: {
            pagina: (n: number, jugadorId: string | null) => {
              pedidas.push({ pagina: n, jugadorId });
              return responder(n);
            },
          },
        },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: sesion },
      ],
    });
    facade = TestBed.inject(RankingFacade);
  });

  it('loads the first page and then leaves the other four in the Service Worker cache', () => {
    facade.cargar();
    expect(facade.estado()).toBe('CON_DATOS');
    expect(facade.entradas()).toHaveLength(10);
    expect(facade.hayMas()).toBe(true);
    expect(facade.totalElementos()).toBe(50);
    expect(facade.generadoEn()).toEqual(new Date('2026-10-15T00:00:00Z'));
    expect(pedidas.map((p) => p.pagina)).toEqual([0, 1, 2, 3, 4]);
  });

  it('sends the saved numeric player ID and exposes the own position', () => {
    sesion.id = '7';
    responder = (n) => of(pagina(n, true, fila(73)));
    facade.cargar();
    expect(pedidas[0]).toEqual({ pagina: 0, jugadorId: '7' });
    expect(facade.miPosicion()?.posicion).toBe(73);
  });

  it('ignores a saved ID that is not numeric', () => {
    sesion.id = 'a1b2-uuid';
    facade.cargar();
    expect(pedidas[0].jugadorId).toBeNull();
  });

  it('appends the next page with verMas() and stops at the last one', () => {
    conectividad.enLinea.set(false); // no prefetch, so only the requested pages are asked
    responder = (n) => of(pagina(n, n === 1));
    facade.cargar();
    facade.verMas();
    expect(facade.entradas()).toHaveLength(20);
    expect(facade.hayMas()).toBe(false);
    facade.verMas();
    expect(pedidas.map((p) => p.pagina)).toEqual([0, 1]);
  });

  it('shows DESDE_CACHE when the saved copy is served without connection', () => {
    conectividad.enLinea.set(false);
    facade.cargar();
    expect(facade.estado()).toBe('DESDE_CACHE');
    expect(facade.entradas()).toHaveLength(10);
  });

  it('reports SIN_RED without connection and nothing saved, and reloads when it returns', () => {
    responder = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    conectividad.enLinea.set(false);
    facade.cargar();
    expect(facade.estado()).toBe('SIN_RED');
    expect(facade.error()).toBeTruthy();

    responder = (n) => of(pagina(n, true));
    conectividad.enLinea.set(true);
    TestBed.tick();
    expect(facade.estado()).toBe('CON_DATOS');
  });

  it('reports ERROR on a server failure and VACIO when there are no victories', () => {
    responder = () => throwError(() => new HttpErrorResponse({ status: 500 }));
    facade.cargar();
    expect(facade.estado()).toBe('ERROR');
    responder = () => of({ ...pagina(0, true), contenido: [], totalElementos: 0 });
    facade.cargar();
    expect(facade.estado()).toBe('VACIO');
  });

  it('drops the answers of an earlier load when cargar() runs again', () => {
    conectividad.enLinea.set(false); // no prefetch, so only the requested pages are asked
    const vieja = new Subject<PaginaRanking>();
    const masVieja = new Subject<PaginaRanking>();
    responder = (n) => (n === 0 ? vieja : masVieja);
    facade.cargar();
    vieja.next(pagina(0)); // first load arrives, then "Ver más" stays in flight
    facade.verMas();
    expect(facade.cargandoMas()).toBe(true);

    const nueva = new Subject<PaginaRanking>();
    responder = () => nueva;
    facade.cargar();
    expect(facade.cargandoMas()).toBe(false);
    masVieja.next(pagina(1)); // late page of the earlier load
    nueva.next(pagina(0, true));

    expect(facade.entradas().map((e) => e.posicion)).toEqual(
      pagina(0).contenido.map((e) => e.posicion),
    );
    expect(facade.hayMas()).toBe(false);
    expect(vieja.observed || masVieja.observed).toBe(false);
  });

  it('shows a single page in place of the rows with irAPagina() and keeps it within 5 pages', () => {
    conectividad.enLinea.set(false); // no prefetch, so only the requested pages are asked
    facade.cargar();
    expect(facade.totalPaginas()).toBe(5);
    facade.irAPagina(2);
    expect(facade.paginaActual()).toBe(2);
    expect(facade.entradas().map((e) => e.posicion)).toEqual([
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ]);
    facade.irAPagina(2); // the page already shown is not asked again
    facade.irAPagina(5); // there is no sixth page
    facade.irAPagina(-1);
    expect(pedidas.map((p) => p.pagina)).toEqual([0, 2]);

    facade.cargar();
    expect(facade.paginaActual()).toBe(0);
  });

  it('asks for fresh data of the page shown when the connection returns after DESDE_CACHE', () => {
    conectividad.enLinea.set(false);
    facade.cargar();
    facade.irAPagina(1);
    expect(facade.estado()).toBe('DESDE_CACHE');

    conectividad.enLinea.set(true);
    TestBed.tick();
    expect(facade.estado()).toBe('CON_DATOS');
    expect(facade.paginaActual()).toBe(1);
    expect(pedidas.map((p) => p.pagina)).toEqual([0, 1, 1]);
  });

  it('keeps the page shown when irAPagina() fails without connection', () => {
    conectividad.enLinea.set(false);
    facade.cargar();
    responder = () => throwError(() => new HttpErrorResponse({ status: 504 }));
    facade.irAPagina(3);
    expect(facade.paginaActual()).toBe(0);
    expect(facade.entradas()[0].posicion).toBe(1);
    expect(facade.error()).toContain('no está guardada');
    expect(facade.cargandoMas()).toBe(false);
  });

  it('keeps the rows already shown when "Ver más" fails', () => {
    conectividad.enLinea.set(false);
    facade.cargar();
    responder = () => throwError(() => new HttpErrorResponse({ status: 504 }));
    facade.verMas();
    expect(facade.entradas()).toHaveLength(10);
    expect(facade.estado()).toBe('DESDE_CACHE');
    expect(facade.error()).toContain('Sin conexión');
    expect(facade.cargandoMas()).toBe(false);
  });
});
