import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Conectividad } from '../../domain/ports/conectividad';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { RetroalimentacionRepository } from '../../domain/ports/retroalimentacion.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { ConectividadFalsa, OutboxEnMemoria, SesionFalsa } from '../../testing/fakes';
import { RetroalimentacionFacade } from './retroalimentacion.facade';

describe('RetroalimentacionFacade with a shared outbox', () => {
  let enviadas: string[];
  let outbox: OutboxEnMemoria;
  let conectividad: ConectividadFalsa;
  let facade: RetroalimentacionFacade;

  beforeEach(() => {
    enviadas = [];
    outbox = new OutboxEnMemoria();
    conectividad = new ConectividadFalsa();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RetroalimentacionRepository,
          useValue: {
            enviar: (_d: unknown, clave: string) => {
              enviadas.push(clave);
              return of({ id: '5', creadaEn: new Date() });
            },
          },
        },
        { provide: OutboxRepository, useValue: outbox },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: new SesionFalsa() },
      ],
    });
    facade = TestBed.inject(RetroalimentacionFacade);
  });

  const datos = { categoria: 'ERROR', componente: 'PWA', mensaje: 'La bola se atoró' } as const;

  it('queues feedback without connection and sends it when the connection returns', async () => {
    conectividad.enLinea.set(false);
    expect(await facade.enviar(datos)).toBe('EN_COLA');
    expect(enviadas).toHaveLength(0);
    conectividad.enLinea.set(true);
    await facade.sincronizar();
    expect(enviadas).toHaveLength(1);
    expect(facade.envios()[0].estado).toBe('ENVIADO');
  });

  it('ignores the surveys that share the outbox', async () => {
    await outbox.guardar({
      id: 'encuesta-1',
      tipo: 'encuesta',
      contenido: { percepcionRiesgo: 4, cambioOpinion: 3, claridadMensaje: 5 },
      creadoEn: '2026-10-14T20:00:00.000Z',
      intentos: 0,
      estado: 'PENDIENTE',
    });
    await facade.sincronizar();
    expect(enviadas).toHaveLength(0);
    expect(facade.envios()).toHaveLength(0);
    expect(outbox.filas.get('encuesta-1')?.estado).toBe('PENDIENTE');
  });
});
