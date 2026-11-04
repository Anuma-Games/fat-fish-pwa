import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { Encuesta, RespuestaEncuesta } from '../../domain/models/encuesta';
import { Conectividad } from '../../domain/ports/conectividad';
import { EncuestaRepository } from '../../domain/ports/encuesta.repository';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { SesionRepository } from '../../domain/ports/sesion.repository';
import { ConectividadFalsa, OutboxEnMemoria, SesionFalsa } from '../../testing/fakes';
import { EncuestaFacade } from './encuesta.facade';

const datos: Encuesta = {
  percepcionRiesgo: 4,
  cambioOpinion: 3,
  claridadMensaje: 5,
  comentario: ' Me hizo pensar ',
};

describe('EncuestaFacade', () => {
  let enviadas: { datos: Encuesta; clave: string }[];
  let responder: () => Observable<RespuestaEncuesta>;
  let outbox: OutboxEnMemoria;
  let conectividad: ConectividadFalsa;
  let facade: EncuestaFacade;

  beforeEach(() => {
    enviadas = [];
    responder = () => of({ id: '9', enviadaEn: new Date() });
    outbox = new OutboxEnMemoria();
    conectividad = new ConectividadFalsa();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EncuestaRepository,
          useValue: {
            enviar: (d: Encuesta, clave: string) => {
              enviadas.push({ datos: d, clave });
              return responder();
            },
          },
        },
        { provide: OutboxRepository, useValue: outbox },
        { provide: Conectividad, useValue: conectividad },
        { provide: SesionRepository, useValue: new SesionFalsa() },
      ],
    });
    facade = TestBed.inject(EncuestaFacade);
  });

  it('sends the survey with the outbox id as Idempotency-Key and trims the comment', async () => {
    expect(await facade.enviar(datos)).toBe('ENVIADO');
    expect(enviadas).toHaveLength(1);
    expect(enviadas[0].datos.comentario).toBe('Me hizo pensar');
    const [guardado] = await outbox.todos();
    expect(guardado).toMatchObject({ tipo: 'encuesta', estado: 'ENVIADO', idServidor: '9' });
    expect(guardado.id).toBe(enviadas[0].clave);
    expect(facade.enviando()).toBe(false);
  });

  it('queues the survey in the outbox without connection and sends nothing', async () => {
    conectividad.enLinea.set(false);
    expect(await facade.enviar(datos)).toBe('EN_COLA');
    expect(enviadas).toHaveLength(0);
    expect(facade.pendientes()).toBe(1);
    expect(facade.envios()[0].estado).toBe('PENDIENTE');
  });

  it('sends the queued survey when the connection returns', async () => {
    conectividad.enLinea.set(false);
    await facade.enviar(datos);
    conectividad.enLinea.set(true);
    await facade.sincronizar();
    expect(enviadas).toHaveLength(1);
    expect(facade.pendientes()).toBe(0);
    expect(facade.envios()[0].estado).toBe('ENVIADO');
  });

  it('keeps it queued when the connection drops during the send', async () => {
    responder = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    expect(await facade.enviar(datos)).toBe('EN_COLA');
    expect(facade.pendientes()).toBe(1);
  });

  it('rejects an invalid survey without queueing it', async () => {
    expect(await facade.enviar({ ...datos, percepcionRiesgo: 9 as never })).toBe('RECHAZADO');
    expect(facade.error()).toContain('del 1 al 5');
    expect(await outbox.todos()).toHaveLength(0);
  });

  it('reports RECHAZADO when the server refuses the survey', async () => {
    responder = () => throwError(() => new HttpErrorResponse({ status: 400 }));
    expect(await facade.enviar(datos)).toBe('RECHAZADO');
    expect(facade.error()).toBeTruthy();
  });
});
