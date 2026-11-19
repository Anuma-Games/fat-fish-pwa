import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Conectividad } from '../../domain/ports/conectividad';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { RetroalimentacionRepository } from '../../domain/ports/retroalimentacion.repository';
import { SegundoPlano } from '../../domain/ports/segundo-plano';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import {
  ConectividadFalsa,
  OutboxEnMemoria,
  SegundoPlanoFalso,
  SesionFalsa,
} from '../../testing/fakes';
import { RetroalimentacionFacade } from './retroalimentacion.facade';

describe('RetroalimentacionFacade with a shared outbox', () => {
  let enviadas: string[];
  let outbox: OutboxEnMemoria;
  let conectividad: ConectividadFalsa;
  let segundoPlano: SegundoPlanoFalso;
  let facade: RetroalimentacionFacade;

  beforeEach(() => {
    enviadas = [];
    outbox = new OutboxEnMemoria();
    conectividad = new ConectividadFalsa();
    segundoPlano = new SegundoPlanoFalso();
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
        { provide: SegundoPlano, useValue: segundoPlano },
      ],
    });
    facade = TestBed.inject(RetroalimentacionFacade);
  });

  const datos = { categoria: 'ERROR', componente: 'PWA', mensaje: 'La bola se atoró' } as const;

  it('logs an outbox that cannot be read when the connection returns, without an unhandled rejection', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    conectividad.enLinea.set(false);
    TestBed.tick();
    vi.spyOn(outbox, 'todos').mockRejectedValue(new ReferenceError('indexedDB is not defined'));
    conectividad.enLinea.set(true);
    TestBed.tick();
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo revisar el outbox'),
        expect.any(ReferenceError),
      ),
    );
  });

  it('queues feedback without connection and sends it when the connection returns', async () => {
    conectividad.enLinea.set(false);
    expect(await facade.enviar(datos)).toBe('EN_COLA');
    expect(enviadas).toHaveLength(0);
    conectividad.enLinea.set(true);
    await facade.sincronizar();
    expect(enviadas).toHaveLength(1);
    // The record stays in the IndexedDB outbox (what DevTools shows), marked as sent
    expect(outbox.filas.get(enviadas[0])).toMatchObject({ estado: 'ENVIADO', idServidor: '5' });
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
    expect(outbox.filas.get('encuesta-1')?.estado).toBe('PENDIENTE');
  });

  it('asks for Background Sync only while the feedback waits in the outbox', async () => {
    conectividad.enLinea.set(false);
    await facade.enviar(datos);
    expect(segundoPlano.programados).toBe(1);
    conectividad.enLinea.set(true);
    await facade.sincronizar();
    expect(segundoPlano.programados).toBe(1);
    expect(await facade.enviar(datos)).toBe('ENVIADO');
    expect(segundoPlano.programados).toBe(1);
  });
});
