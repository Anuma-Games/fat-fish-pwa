import { HttpErrorResponse } from '@angular/common/http';
import { EnvioEncuesta } from '../../domain/models/envio-outbox';
import { OutboxEnMemoria } from '../../testing/fakes';
import { MAX_INTENTOS, intentarEnvio } from './intentar-envio';

function envio(): EnvioEncuesta {
  return {
    id: 'e1',
    tipo: 'encuesta',
    contenido: { percepcionRiesgo: 4, cambioOpinion: 3, claridadMensaje: 5 },
    creadoEn: '2026-10-14T20:00:00.000Z',
    intentos: 0,
    estado: 'PENDIENTE',
  };
}

const fallo = (status: number) => () => Promise.reject(new HttpErrorResponse({ status }));

describe('intentarEnvio', () => {
  let outbox: OutboxEnMemoria;

  beforeEach(() => (outbox = new OutboxEnMemoria()));

  it('marks the submission ENVIADO and keeps the server id', async () => {
    const e = envio();
    expect(await intentarEnvio(e, outbox, async () => '42', 'POST /x')).toBe('ENVIADO');
    expect(outbox.filas.get('e1')).toMatchObject({
      estado: 'ENVIADO',
      idServidor: '42',
      intentos: 1,
    });
  });

  it('leaves it PENDIENTE when there is no network, until the attempts run out', async () => {
    const e = envio();
    expect(await intentarEnvio(e, outbox, fallo(0), 'POST /x')).toBe('PENDIENTE');
    e.intentos = MAX_INTENTOS - 1;
    expect(await intentarEnvio(e, outbox, fallo(503), 'POST /x')).toBe('FALLIDO');
  });

  it('retries a 429 but does not retry a 400', async () => {
    expect(await intentarEnvio(envio(), outbox, fallo(429), 'POST /x')).toBe('PENDIENTE');
    const rechazado = envio();
    expect(await intentarEnvio(rechazado, outbox, fallo(400), 'POST /x')).toBe('FALLIDO');
    expect(rechazado.ultimoError).toBe('Rechazado (400)');
  });
});
