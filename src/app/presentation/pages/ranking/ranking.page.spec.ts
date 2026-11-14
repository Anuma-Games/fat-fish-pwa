import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Perfil } from '../../../domain/models/perfil';
import { EntradaRanking, PaginaRanking } from '../../../domain/models/ranking';
import { Conectividad } from '../../../domain/ports/conectividad';
import { PerfilRepository } from '../../../domain/ports/perfil.repository';
import { RankingRepository } from '../../../domain/ports/ranking.repository';
import { SesionRepository } from '../../../domain/ports/sesion.repository';
import { ConectividadFalsa, SesionFalsa, perfilDeJugador } from '../../../testing/fakes';
import { RankingPage } from './ranking.page';

const fila = (posicion: number): EntradaRanking => ({
  posicion,
  jugadorId: String(posicion),
  alias: `jugador${posicion}`,
  puntaje: 2000 - posicion,
  logradoEn: new Date('2026-10-13T22:00:00Z'),
});

function pagina(numero: number, miPosicion: EntradaRanking | null = null): PaginaRanking {
  return {
    contenido: Array.from({ length: 10 }, (_, i) => fila(numero * 10 + i + 1)),
    pagina: numero,
    tamano: 10,
    totalElementos: 50,
    ultima: numero === 4,
    miPosicion,
    generadoEn: new Date(2026, 9, 9, 18, 42),
  };
}

describe('RankingPage', () => {
  let pedidas: number[];
  let responder: (n: number) => Observable<PaginaRanking>;
  let responderPerfil: (id: string) => Observable<Perfil>;
  let conectividad: ConectividadFalsa;
  let sesion: SesionFalsa;

  beforeEach(async () => {
    pedidas = [];
    responder = (n) => of(pagina(n));
    responderPerfil = (id) => of(perfilDeJugador(id));
    conectividad = new ConectividadFalsa();
    sesion = new SesionFalsa();
    await TestBed.configureTestingModule({
      imports: [RankingPage],
      providers: [
        provideRouter([]),
        {
          provide: RankingRepository,
          useValue: {
            pagina: (n: number) => {
              pedidas.push(n);
              return responder(n);
            },
          },
        },
        { provide: PerfilRepository, useValue: { perfil: (id: string) => responderPerfil(id) } },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: sesion },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(RankingPage);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const posiciones = (el: HTMLElement) =>
    [...el.querySelectorAll('.ranking .posicion')].map((p) => Number(p.textContent));

  it('shows the first 10 players and a pager of 5 pages', async () => {
    const { el } = await render();
    expect(posiciones(el)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(el.querySelector('.ranking .alias')?.textContent).toContain('jugador1');
    expect(el.querySelector('.ranking .id')?.textContent).toContain('ID #1');
    expect(el.querySelectorAll('.numero')).toHaveLength(5);
    expect(el.querySelector('.numero.actual')?.textContent?.trim()).toBe('1');
  });

  it('moves between pages with the numbers and the arrows', async () => {
    const { fixture, el } = await render();
    (el.querySelectorAll('.numero')[2] as HTMLElement).click();
    await fixture.whenStable();
    expect(posiciones(el)[0]).toBe(21);
    expect(el.querySelector('.numero.actual')?.textContent?.trim()).toBe('3');

    (el.querySelector('[aria-label="Página siguiente"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(posiciones(el)[0]).toBe(31);

    (el.querySelector('[aria-label="Página anterior"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(posiciones(el)[0]).toBe(21);
  });

  it('keeps the own position fixed on every page when the visitor consulted a profile', async () => {
    sesion.id = '1042';
    responder = (n) => of(pagina(n, { ...fila(27), jugadorId: '1042', alias: 'pezgordo' }));
    const { fixture, el } = await render();
    expect(el.querySelector('.fila.fija')?.textContent).toContain('Tú: pezgordo');
    (el.querySelectorAll('.numero')[4] as HTMLElement).click();
    await fixture.whenStable();
    expect(el.querySelector('.fila.fija .posicion')?.textContent?.trim()).toBe('27');
  });

  it('suggests looking up the profile when there is no own position', async () => {
    const { el } = await render();
    expect(el.querySelector('.fila.fija')).toBeNull();
    expect(el.querySelector('.pista a')?.getAttribute('href')).toBe('/acceso');
  });

  it('tells a consulted player without victories how to enter the ranking', async () => {
    sesion.id = '1042';
    const { el } = await render();
    expect(el.querySelector('.fila.fija')).toBeNull();
    expect(el.querySelector('.pista')?.textContent).toContain('Todavía no tienes victorias');
    expect(el.querySelector('.pista a')).toBeNull();
  });

  it('forgets a saved player that no longer exists and invites to look the profile up', async () => {
    sesion.id = '1042';
    responderPerfil = () => throwError(() => new HttpErrorResponse({ status: 404 }));
    const { el } = await render();
    expect(sesion.id).toBeNull();
    expect(el.querySelector('.pista')?.textContent).not.toContain('Todavía no tienes victorias');
    expect(el.querySelector('.pista a')?.getAttribute('href')).toBe('/acceso');
    expect(el.querySelector('.notice.error')).toBeNull();
    expect(posiciones(el)).toHaveLength(10);
  });

  it('shows no hint while it confirms that the saved player still exists', async () => {
    sesion.id = '1042';
    const enCamino = new Subject<Perfil>();
    responderPerfil = () => enCamino;
    const { el, fixture } = await render();
    // Neither "no victories" nor "look it up" flashes before the profile answers
    expect(el.querySelector('.pista')).toBeNull();
    enCamino.error(new HttpErrorResponse({ status: 404 }));
    await fixture.whenStable();
    expect(el.querySelector('.pista a')?.getAttribute('href')).toBe('/acceso');
  });

  it('keeps the saved player when there is no connection to confirm it', async () => {
    sesion.id = '1042';
    conectividad.enLinea.set(false);
    responderPerfil = () => throwError(() => new HttpErrorResponse({ status: 504 }));
    const { el } = await render();
    expect(sesion.id).toBe('1042');
    expect(el.querySelector('.pista')?.textContent).toContain('Todavía no tienes victorias');
    expect(el.querySelector('.pista a')).toBeNull();
  });

  it('shows the saved copy with its date without connection', async () => {
    conectividad.enLinea.set(false);
    const { el } = await render();
    const aviso = el.querySelector('.notice.offline')?.textContent ?? '';
    expect(aviso).toContain('Sin conexión');
    expect(aviso).toContain('9 de Oct a las 18:42');
    expect(posiciones(el)).toHaveLength(10);
  });

  it('keeps the page shown when the next one is not saved without connection', async () => {
    conectividad.enLinea.set(false);
    const { fixture, el } = await render();
    responder = () => throwError(() => new HttpErrorResponse({ status: 504 }));
    (el.querySelectorAll('.numero')[3] as HTMLElement).click();
    await fixture.whenStable();
    expect(posiciones(el)[0]).toBe(1);
    expect(el.querySelector('.notice.error')?.textContent).toContain('no está guardada');
  });

  it('asks for connection when nothing is saved and offers a retry on server errors', async () => {
    responder = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    conectividad.enLinea.set(false);
    const sinRed = await render();
    expect(sinRed.el.querySelector('.notice.offline')?.textContent).toContain(
      'todavía no hay un ranking guardado',
    );

    responder = () => throwError(() => new HttpErrorResponse({ status: 500 }));
    conectividad.enLinea.set(true);
    const { fixture, el } = await render();
    expect(el.querySelector('.notice.error')?.textContent).toContain('No pudimos consultar');
    responder = (n) => of(pagina(n));
    (el.querySelector('.btn.ghost') as HTMLElement).click();
    await fixture.whenStable();
    expect(posiciones(el)).toHaveLength(10);
  });
});
