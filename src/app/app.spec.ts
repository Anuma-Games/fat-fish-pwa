import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { of } from 'rxjs';
import { App } from './app';
import { puertos } from './app.config';
import { routes } from './app.routes';
import { MENU } from './core/config/landing.config';
import { Conectividad } from './domain/ports/conectividad';
import { OutboxRepository } from './domain/ports/outbox.repository';
import { RetroalimentacionRepository } from './domain/ports/retroalimentacion.repository';
import { ConectividadFalsa, OutboxEnMemoria } from './testing/fakes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
        ...puertos,
        // App creates the feedback and survey facades at start, and they read the outbox
        { provide: OutboxRepository, useValue: new OutboxEnMemoria() },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand in the top bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header .marca')?.textContent).toContain('Fat Fish');
  });
});

describe('App with feedback saved offline', () => {
  it('sends it when the connection returns, without opening the Opinión page', async () => {
    const outbox = new OutboxEnMemoria();
    const conectividad = new ConectividadFalsa();
    const enviadas: string[] = [];
    conectividad.enLinea.set(false);
    await outbox.guardar({
      id: 'pendiente-1',
      tipo: 'retroalimentacion',
      contenido: { categoria: 'ERROR', componente: 'PWA', mensaje: 'Sin señal en el camión' },
      creadoEn: '2026-11-10T04:37:27.349Z',
      intentos: 0,
      estado: 'PENDIENTE',
    });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
        ...puertos,
        { provide: OutboxRepository, useValue: outbox },
        { provide: Conectividad, useValue: conectividad },
        {
          provide: RetroalimentacionRepository,
          useValue: {
            enviar: (_d: unknown, clave: string) => {
              enviadas.push(clave);
              return of({ id: '8', creadaEn: new Date() });
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(enviadas).toHaveLength(0);

    conectividad.enLinea.set(true);
    await fixture.whenStable();
    await vi.waitFor(() => expect(outbox.filas.get('pendiente-1')?.estado).toBe('ENVIADO'));
    expect(enviadas).toEqual(['pendiente-1']);
  });
});

@Component({ template: '' })
class PaginaVacia {}

describe('App top bar and side menu', () => {
  const rutas = [
    { path: '', component: PaginaVacia, data: { layout: 'landing' } },
    { path: 'acceso', component: PaginaVacia, data: { seccion: 'Expediente' } },
    { path: 'perfil', component: PaginaVacia, data: { seccion: 'Expediente' } },
    { path: 'ranking', component: PaginaVacia, data: { seccion: 'Ranking' } },
    { path: 'opinion/retroalimentacion', component: PaginaVacia, data: { seccion: 'Opinión' } },
    { path: 'opinion/encuesta', component: PaginaVacia, data: { seccion: 'Opinión' } },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(rutas),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
        ...puertos,
        { provide: OutboxRepository, useValue: new OutboxEnMemoria() },
      ],
    }).compileComponents();
  });

  async function abrir(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function resaltados(pagina: HTMLElement): string[] {
    const enlaces = pagina.querySelectorAll(`nav[aria-label="${MENU.app.titulo}"] a.active`);
    return Array.from(enlaces, (e) => e.textContent?.trim() ?? '');
  }

  it.each([
    ['/acceso', 'Expediente'],
    ['/perfil', 'Expediente'],
    ['/ranking', 'Ranking'],
    ['/opinion/retroalimentacion', 'Opinión'],
    ['/opinion/encuesta', 'Opinión'],
  ])('highlights only its section at %s', async (url, seccion) => {
    expect(resaltados(await abrir(url))).toEqual([seccion]);
  });

  it('keeps the highlight when the URL has a query or a fragment', async () => {
    expect(resaltados(await abrir('/acceso?busqueda=pez#resultados'))).toEqual(['Expediente']);
  });

  it('marks the highlighted link as the current page', async () => {
    const pagina = await abrir('/perfil');
    const actuales = pagina.querySelectorAll(
      `nav[aria-label="${MENU.app.titulo}"] a[aria-current="page"]`,
    );
    expect(Array.from(actuales, (e) => e.textContent?.trim())).toEqual(['Expediente']);
  });

  it('gives every side menu link a route with its section', () => {
    const secciones = new Set(routes.map((r) => r.data?.['seccion']));
    for (const e of MENU.app.enlaces) expect(secciones).toContain(e.texto);
  });

  it('highlights the same section in the links of the top bar', async () => {
    const pagina = await abrir('/opinion/encuesta');
    const enBarra = pagina.querySelectorAll('nav[aria-label="Secciones"] a.activo');
    expect(Array.from(enBarra, (e) => e.textContent?.trim())).toEqual(['Opinión']);
  });

  it('uses the side menu of the landing page, which opens with the ☰ button', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/ranking');
    await fixture.whenStable();
    const pagina = fixture.nativeElement as HTMLElement;
    const panel = pagina.querySelector('#lp-menu') as HTMLElement;
    expect(panel.classList).not.toContain('abierto');
    (pagina.querySelector('.hamburguesa') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(panel.classList).toContain('abierto');
  });

  it('takes the visitor back to the sections of the landing page from the menu', async () => {
    const pagina = await abrir('/ranking');
    const destinos = Array.from(
      pagina.querySelectorAll(`#lp-menu nav[aria-label="${MENU.mesa.titulo}"] a`),
      (a) => a.getAttribute('href'),
    );
    expect(destinos).toContain('/');
    expect(destinos).toContain('/#comodines');
  });

  it('tells in the menu when the data was last synchronized', async () => {
    const pagina = await abrir('/perfil');
    expect(pagina.querySelector('#lp-menu .sync')?.textContent).toContain('Última sincronización');
  });

  it('leaves the top bar to the landing page itself', async () => {
    const pagina = await abrir('/');
    expect(pagina.querySelector('app-barra-nav')).toBeNull();
    expect(resaltados(pagina)).toEqual([]);
  });
});
