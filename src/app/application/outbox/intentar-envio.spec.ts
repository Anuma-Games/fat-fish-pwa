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

describe('intentarEnvio with a submission left ENVIANDO', () => {
  it('sends it again with the same key and counts the attempt', async () => {
    const outbox = new OutboxEnMemoria();
    const e: EnvioEncuesta = { ...envio(), estado: 'ENVIANDO', intentos: 1 };
    await outbox.guardar(e);
    let llamadas = 0;
    expect(await intentarEnvio(e, outbox, async () => String(++llamadas), 'POST /x')).toBe(
      'ENVIADO',
    );
    expect(llamadas).toBe(1);
    expect(outbox.filas.get('e1')).toMatchObject({ estado: 'ENVIADO', intentos: 2 });
  });
});

describe('intentarEnvio and the outbox lock', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('marks ENVIANDO and sends only while holding the lock shared with the service worker', async () => {
    let candado: string | null = null;
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: async (nombre: string, fn: () => Promise<unknown>) => {
          candado = nombre;
          try {
            return await fn();
          } finally {
            candado = null;
          }
        },
      },
    });
    const outbox = new OutboxEnMemoria();
    const estadosVistos: (string | null)[] = [];
    const guardar = outbox.guardar.bind(outbox);
    outbox.guardar = async (e) => {
      estadosVistos.push(`${e.estado}:${candado}`);
      return guardar(e);
    };
    await intentarEnvio(envio(), outbox, async () => '1', 'POST /x');

    // An ENVIANDO outside the lock would look abandoned to the other side and be sent twice
    expect(estadosVistos).toEqual(['ENVIANDO:fatfish-outbox', 'ENVIADO:fatfish-outbox']);
  });
});
