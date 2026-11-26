import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { HistorialFacade } from '../../../application/facades/historial.facade';
import { JugadorResumen } from '../../../domain/models/jugador-resumen';
import { Conectividad } from '../../../domain/ports/conectividad';
import { JugadorRepository } from '../../../domain/ports/jugador.repository';
import { SesionRepository } from '../../../domain/ports/sesion.repository';
import { ConectividadFalsa, SesionFalsa } from '../../../testing/fakes';
import { AccesoPage } from './acceso.page';

const pezgordo: JugadorResumen = { jugadorId: '1042', alias: 'pezgordo' };
const otroPezgordo: JugadorResumen = { jugadorId: '2317', alias: 'pezgordo' };

describe('AccesoPage', () => {
  let respuesta: Observable<JugadorResumen[]>;
  let consultas: string[];
  let abiertos: string[];
  let conectividad: ConectividadFalsa;

  beforeEach(async () => {
    consultas = [];
    abiertos = [];
    respuesta = of([pezgordo, otroPezgordo]);
    conectividad = new ConectividadFalsa();
    await TestBed.configureTestingModule({
      imports: [AccesoPage],
      providers: [
        provideRouter([]),
        {
          provide: JugadorRepository,
          useValue: {
            buscar: (texto: string) => {
              consultas.push(texto);
              return respuesta;
            },
          },
        },
        { provide: HistorialFacade, useValue: { buscar: (id: string) => abiertos.push(id) } },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: new SesionFalsa() },
      ],
    }).compileComponents();
  });

  /** Renders the page, types `texto` in the search field and submits it. */
  async function buscar(texto: string) {
    const fixture = TestBed.createComponent(AccesoPage);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const campo = el.querySelector('#busqueda') as HTMLInputElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    return { el, navegar };
  }

  /** Renders the page and types each text in turn, as the visitor would, without submitting. */
  async function teclear(...textos: string[]) {
    const fixture = TestBed.createComponent(AccesoPage);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    // Fake clock only for the typing, after the first render
    vi.useFakeTimers();
    const el = fixture.nativeElement as HTMLElement;
    const campo = el.querySelector('#busqueda') as HTMLInputElement;
    for (const texto of textos) {
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();
    await fixture.whenStable();
    return { el, navegar, fixture };
  }

  afterEach(() => vi.useRealTimers());

  it('has its own title, apart from the dossier', async () => {
    const fixture = TestBed.createComponent(AccesoPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Busca tu expediente');
    expect(el.querySelector('h1')?.textContent).not.toContain('Lo que el casino sabe de ti');
  });

  it('shows the players while the visitor types, once they stop for a moment', async () => {
    const { el } = await teclear('p', 'pe', 'pez', 'pezg');
    // One search for the last text only, not one per key
    expect(consultas).toEqual(['pezg']);
    expect(alias(el)).toEqual(['pezgordo ID #1042', 'pezgordo ID #2317']);
  });

  it('does not open the dossier by itself while typing, even with a single match', async () => {
    respuesta = of([pezgordo]);
    const { el, navegar } = await teclear('1042');
    expect(alias(el)).toEqual(['pezgordo ID #1042']);
    expect(abiertos).toEqual([]);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('waits for two letters of an alias, but searches an ID from its first digit', async () => {
    await teclear('p');
    expect(consultas).toEqual([]);
    await teclear('7');
    expect(consultas).toEqual(['7']);
  });

  it('clears the list when the field is emptied', async () => {
    const { el } = await teclear('pezgordo', '');
    expect(consultas).toEqual([]);
    expect(el.querySelector('.jugadores')).toBeNull();
  });

  it('clears the list when the text stops being worth searching', async () => {
    await teclear('pe');
    // "pe" erased to "p": the list of "pe" does not stay under a text that is not searched
    const { el } = await teclear('p');
    expect(consultas).toEqual(['pe']);
    expect(el.querySelector('.jugadores')).toBeNull();
  });

  it('submits with Enter while a typed search is still on its way', async () => {
    const enCamino = new Subject<JugadorResumen[]>();
    respuesta = enCamino;
    const { el, navegar, fixture } = await teclear('3');
    // The browser only submits with Enter when the submit button is enabled
    expect((el.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    enCamino.next([pezgordo]);
    await fixture.whenStable();
    expect(consultas).toEqual(['3', '3']);
    expect(abiertos).toEqual(['1042']);
    expect(navegar).toHaveBeenCalledWith(['/perfil']);
  });

  const alias = (el: HTMLElement) =>
    [...el.querySelectorAll('.jugador')].map(
      (b) => `${b.querySelector('.alias')?.textContent} ${b.querySelector('.id')?.textContent}`,
    );

  it('lists every player with that alias, each one with its ID', async () => {
    const { el } = await buscar('pezgordo');
    expect(consultas).toEqual(['pezgordo']);
    expect(el.querySelector('.titulo-lista')?.textContent).toContain('2');
    expect(alias(el)).toEqual(['pezgordo ID #1042', 'pezgordo ID #2317']);
    expect(el.querySelector('.voz')?.textContent).toContain('Encontré 2. ¿Cuál eres tú?');
  });

  it('gives screen readers the whole line at once, not the typed letters', async () => {
    const { el } = await buscar('pezgordo');
    expect(el.querySelector('.solo-lector[aria-live]')?.textContent).toContain(
      'Encontré 2. ¿Cuál eres tú?',
    );
    expect(el.querySelector('.voz')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not announce every card again when the list changes', async () => {
    const { el } = await buscar('pezgordo');
    expect(el.querySelector('[aria-live] .jugadores')).toBeNull();
  });

  it('searches by ID too, also when it is written as #1042', async () => {
    respuesta = of([pezgordo, { jugadorId: '1043', alias: 'otro' }]);
    const { el } = await buscar('#1042');
    expect(consultas).toEqual(['1042']);
    expect(alias(el)[0]).toBe('pezgordo ID #1042');
  });

  it('opens the dossier of the player the visitor picks', async () => {
    const { el, navegar } = await buscar('pezgordo');
    (el.querySelectorAll('.jugador')[1] as HTMLButtonElement).click();
    expect(abiertos).toEqual(['2317']);
    expect(navegar).toHaveBeenCalledWith(['/perfil']);
  });

  it('goes straight to the dossier when only one player matches', async () => {
    respuesta = of([pezgordo]);
    const { navegar } = await buscar('1042');
    expect(abiertos).toEqual(['1042']);
    expect(navegar).toHaveBeenCalledWith(['/perfil']);
  });

  it('says so when nobody matches', async () => {
    respuesta = of([]);
    const { el, navegar } = await buscar('nadie');
    expect(el.querySelector('.voz .quien')?.textContent).toContain('Sin resultados');
    expect(el.querySelector('.voz')?.textContent).toContain('No tengo a nadie llamado «nadie»');
    expect(el.querySelector('.jugadores')).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('warns without connection when the search is not saved', async () => {
    conectividad.enLinea.set(false);
    respuesta = throwError(() => new HttpErrorResponse({ status: 0 }));
    const { el } = await buscar('pezgordo');
    expect(el.querySelector('.notice.offline')?.textContent).toContain('Sin conexión');
  });

  it('offers to retry when the server fails', async () => {
    respuesta = throwError(() => new HttpErrorResponse({ status: 500 }));
    const { el } = await buscar('pezgordo');
    expect(el.textContent).toContain('No pudimos buscar jugadores');
    respuesta = of([pezgordo, otroPezgordo]);
    (el.querySelector('.reintentar') as HTMLButtonElement).click();
    expect(consultas).toEqual(['pezgordo', 'pezgordo']);
  });

  it('does not ask the API for a text longer than an alias', async () => {
    const { el } = await buscar('a'.repeat(25));
    expect(consultas).toEqual([]);
    expect(el.textContent).toContain('hasta 24');
  });
});
