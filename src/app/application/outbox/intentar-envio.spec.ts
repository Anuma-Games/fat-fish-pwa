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
    await outbox.guardar({ ...e, intentos: MAX_INTENTOS - 1 });
    expect(await intentarEnvio(e, outbox, fallo(503), 'POST /x')).toBe('FALLIDO');
  });

  it('retries a 429 but does not retry a 400', async () => {
    expect(await intentarEnvio(envio(), outbox, fallo(429), 'POST /x')).toBe('PENDIENTE');
    const rechazado = envio();
    expect(await intentarEnvio(rechazado, outbox, fallo(400), 'POST /x')).toBe('FALLIDO');
    expect(rechazado.ultimoError).toBe('Rechazado (400)');
  });
});

describe('intentarEnvio with the service worker', () => {
  it('does not send a submission that is no longer PENDIENTE in the outbox', async () => {
    const outbox = new OutboxEnMemoria();
    const e = envio();
    await outbox.guardar({ ...e, estado: 'ENVIADO', idServidor: '42', intentos: 1 });
    let llamadas = 0;
    const estado = await intentarEnvio(e, outbox, async () => String(++llamadas), 'POST /x');

    expect(estado).toBe('ENVIADO');
    expect(llamadas).toBe(0);
    expect(e).toMatchObject({ estado: 'ENVIADO', idServidor: '42', intentos: 1 });
  });
});

describe('intentarEnvio with a stale local copy', () => {
  it('counts from the attempts stored in IndexedDB, not from the copy it read before the lock', async () => {
    const outbox = new OutboxEnMemoria();
    // The page read the submission with 3 attempts...
    const local: EnvioEncuesta = { ...envio(), intentos: 3 };
    // ...and while it waited for the lock the service worker made the 4th one
    await outbox.guardar({ ...local, intentos: MAX_INTENTOS - 1, ultimoError: 'Sin conexión' });

    expect(await intentarEnvio(local, outbox, fallo(503), 'POST /x')).toBe('FALLIDO');
    expect(outbox.filas.get('e1')).toMatchObject({ estado: 'FALLIDO', intentos: MAX_INTENTOS });
    expect(local.intentos).toBe(MAX_INTENTOS);
  });
});
