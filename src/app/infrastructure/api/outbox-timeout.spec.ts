import { provideHttpClient, withFetch } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { intentarEnvio, MAX_INTENTOS } from '../../application/outbox/intentar-envio';
import { EnvioOutbox } from '../../domain/models/envio-outbox';
import { OutboxEnMemoria } from '../../testing/fakes';
import { EncuestaApiRepository } from './encuesta-api.repository';
import { RetroalimentacionApiRepository } from './retroalimentacion-api.repository';

const TIMEOUT_MS = 15_000;
const encuesta = { percepcionRiesgo: 4, cambioOpinion: 3, claridadMensaje: 5 } as const;
const retroalimentacion = {
  categoria: 'ERROR',
  componente: 'PWA',
  mensaje: 'Sin respuesta',
} as const;

for (const caso of [
  {
    tipo: 'encuesta' as const,
    contenido: encuesta,
    enviar: (id: string) =>
      firstValueFrom(TestBed.inject(EncuestaApiRepository).enviar(encuesta, id)),
  },
  {
    tipo: 'retroalimentacion' as const,
    contenido: retroalimentacion,
    enviar: (id: string) =>
      firstValueFrom(TestBed.inject(RetroalimentacionApiRepository).enviar(retroalimentacion, id)),
  },
]) {
  describe(`${caso.tipo}: timeout while holding the outbox lock`, () => {
    beforeEach(() => {
      vi.useFakeTimers();
      TestBed.configureTestingModule({ providers: [provideHttpClient(withFetch())] });
      let cola = Promise.resolve<unknown>(undefined);
      vi.stubGlobal('navigator', {
        locks: {
          request: (_nombre: string, fn: () => Promise<unknown>) => {
            const resultado = cola.then(fn);
            cola = resultado.catch(() => undefined);
            return resultado;
          },
        },
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    for (const fase of ['headers', 'body']) {
      for (const intentos of [0, MAX_INTENTOS - 1]) {
        it(`aborts stalled ${fase} after ${intentos} previous attempts and lets the next submission run`, async () => {
          const peticiones: RequestInit[] = [];
          vi.stubGlobal('fetch', (_url: string, opciones: RequestInit) => {
            peticiones.push(opciones);
            if (peticiones.length === 1) {
              if (fase === 'body') {
                return Promise.resolve(
                  new Response(
                    new ReadableStream({
                      start(controller) {
                        opciones.signal!.addEventListener('abort', () =>
                          controller.error(opciones.signal!.reason),
                        );
                      },
                    }),
                  ),
                );
              }
              return new Promise((_resolve, reject) =>
                opciones.signal!.addEventListener('abort', () => reject(opciones.signal!.reason)),
              );
            }
            return Promise.resolve(
              new Response(
                JSON.stringify({ id: '42', enviadaEn: '2026-11-21', creadaEn: '2026-11-21' }),
              ),
            );
          });
          const outbox = new OutboxEnMemoria();
          const primero = {
            id: 'primero',
            tipo: caso.tipo,
            contenido: caso.contenido,
            creadoEn: '2026-11-21',
            estado: 'PENDIENTE',
            intentos,
          } as EnvioOutbox;
          const segundo = { ...primero, id: 'segundo', intentos: 0 };
          const iniciar = (envio: EnvioOutbox) =>
            intentarEnvio(envio, outbox, async () => (await caso.enviar(envio.id)).id, 'POST /x');
          const resultadoPrimero = iniciar(primero);
          const resultadoSegundo = iniciar(segundo);
          await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
          expect(peticiones).toHaveLength(1);
          expect(peticiones[0].signal!.aborted).toBe(false);
          await vi.advanceTimersByTimeAsync(1);
          const esperado = intentos === 0 ? 'PENDIENTE' : 'FALLIDO';
          expect(await resultadoPrimero).toBe(esperado);
          expect(peticiones[0].signal!.aborted).toBe(true);
          expect(outbox.filas.get('primero')).toMatchObject({
            estado: esperado,
            intentos: intentos + 1,
            ultimoError: 'Sin conexión con el servidor',
          });
          expect(await resultadoSegundo).toBe('ENVIADO');
          expect(peticiones).toHaveLength(2);
          expect(new Headers(peticiones[0].headers).get('Idempotency-Key')).toBe('primero');
          await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
          expect(peticiones[1].signal!.aborted).toBe(false);
        });
      }
    }
  });
}
