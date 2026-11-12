import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { of } from 'rxjs';
import { App } from './app';
import { puertos } from './app.config';
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

  it('should render the brand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('Fat Fish');
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

describe('App side menu', () => {
  const rutas = [
    { path: '', component: PaginaVacia, data: { layout: 'landing' } },
    { path: 'acceso', component: PaginaVacia },
    { path: 'perfil', component: PaginaVacia },
    { path: 'ranking', component: PaginaVacia },
    { path: 'opinion/retroalimentacion', component: PaginaVacia },
    { path: 'opinion/encuesta', component: PaginaVacia },
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

  it('does not show the side menu on the landing page', async () => {
    const pagina = await abrir('/');
    expect(pagina.querySelector('aside')).toBeNull();
    expect(resaltados(pagina)).toEqual([]);
  });
});
