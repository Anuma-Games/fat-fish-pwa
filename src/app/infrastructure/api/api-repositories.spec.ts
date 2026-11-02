import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EncuestaApiRepository } from './encuesta-api.repository';
import { JugadorApiRepository } from './jugador-api.repository';
import { RankingApiRepository } from './ranking-api.repository';

const entrada = {
  posicion: 1,
  jugadorId: '7',
  alias: 'pezgordo',
  puntaje: 1510,
  logradoEn: '2026-10-13T22:00:00Z',
};

const ranking = (miPosicion: typeof entrada | null) => ({
  pagina: {
    contenido: [entrada],
    pagina: 0,
    tamano: 10,
    totalElementos: 50,
    totalPaginas: 5,
    ultima: false,
    generadoEn: '2026-10-15T00:00:00Z',
  },
  miPosicion,
});

describe('HTTP repositories of search, ranking and survey', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches players on the same origin and keeps only ID and alias', () => {
    let lista: unknown;
    TestBed.inject(JugadorApiRepository)
      .buscar('pezgordo')
      .subscribe((r) => (lista = r));
    const req = http.expectOne((r) => r.url === '/api/pwa/jugadores');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('busqueda')).toBe('pezgordo');
    req.flush([{ jugadorId: '1', alias: 'pezgordo', ultimaActividad: '2026-10-13T22:00:00Z' }]);
    expect(lista).toEqual([{ jugadorId: '1', alias: 'pezgordo' }]);
  });

  it('asks the ranking with the player ID and maps the nested page and own position', () => {
    let pagina: unknown;
    TestBed.inject(RankingApiRepository)
      .pagina(2, '7')
      .subscribe((r) => (pagina = r));
    const req = http.expectOne((r) => r.url === '/api/pwa/ranking');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('jugadorId')).toBe('7');
    req.flush(ranking({ ...entrada, posicion: 73 }));
    expect(pagina).toMatchObject({
      contenido: [{ posicion: 1, alias: 'pezgordo', logradoEn: new Date('2026-10-13T22:00:00Z') }],
      totalElementos: 50,
      ultima: false,
      miPosicion: { posicion: 73 },
      generadoEn: new Date('2026-10-15T00:00:00Z'),
    });
  });

  it('omits the player ID when there is none and maps a null own position', () => {
    let miPosicion: unknown = 'sin respuesta';
    TestBed.inject(RankingApiRepository)
      .pagina(0, null)
      .subscribe((r) => (miPosicion = r.miPosicion));
    const req = http.expectOne((r) => r.url === '/api/pwa/ranking');
    expect(req.request.params.has('jugadorId')).toBe(false);
    req.flush(ranking(null));
    expect(miPosicion).toBeNull();
  });

  it('posts the survey with the Idempotency-Key and no player data', () => {
    let respuesta: unknown;
    const datos = { percepcionRiesgo: 4, cambioOpinion: 3, claridadMensaje: 5 } as const;
    TestBed.inject(EncuestaApiRepository)
      .enviar(datos, 'clave-1')
      .subscribe((r) => (respuesta = r));
    const req = http.expectOne('/api/pwa/encuesta');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('clave-1');
    expect(req.request.body).toEqual(datos);
    req.flush({ id: '1', created: true, enviadaEn: '2026-10-14T20:00:00Z' });
    expect(respuesta).toEqual({ id: '1', enviadaEn: new Date('2026-10-14T20:00:00Z') });
  });
});