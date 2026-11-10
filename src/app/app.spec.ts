import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { of } from 'rxjs';
import { App } from './app';
import { puertos } from './app.config';
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
