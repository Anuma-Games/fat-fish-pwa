import { HttpErrorResponse } from '@angular/common/http';
import { LOG_PREFIX } from '../../core/config/api.config';
import { esReintentable } from '../../core/http/errores-http';
import { EnvioOutbox, EstadoEnvio, porEnviar } from '../../domain/models/envio-outbox';
import { OutboxRepository } from '../../domain/ports/outbox.repository';
import { conCandadoOutbox } from './candado-outbox';

export const MAX_INTENTOS = 5;

/**
 * One attempt to send a submission of the outbox, shared by every kind of submission.
 * Updates the envelope (attempts, state, error) and saves it each time it changes.
 * A temporary failure leaves it PENDIENTE until MAX_INTENTOS; anything else is FALLIDO.
 * `enviar` must resolve with the id the server gave to the stored record.
 *
 * The attempt runs inside the outbox lock shared with the service worker (public/sw.js), and the
 * submission is read again inside it: if the worker or another tab already sent it, it is not sent
 * twice and the envelope takes the stored state. One left ENVIANDO is sent again (see `porEnviar`).
 */
export function intentarEnvio(
  envio: EnvioOutbox,
  outbox: OutboxRepository,
  enviar: () => Promise<string>,
  descripcion: string,
): Promise<EstadoEnvio> {
  return conCandadoOutbox(async () => {
    // The stored copy wins: while this page waited for the lock, the worker may have sent it or
    // used attempts, and a stale local copy would count from an old number
    const guardado = await outbox.obtener(envio.id);
    if (guardado) Object.assign(envio, guardado);
    if (!porEnviar(envio)) return envio.estado;
    return intentar(envio, outbox, enviar, descripcion);
  });
}

async function intentar(
  envio: EnvioOutbox,
  outbox: OutboxRepository,
  enviar: () => Promise<string>,
  descripcion: string,
): Promise<EstadoEnvio> {
  // An ENVIANDO recovered after its last attempt has no attempts left: no more POSTs
  if (envio.intentos >= MAX_INTENTOS) {
    envio.estado = 'FALLIDO';
    envio.ultimoError ??= 'Se agotaron los intentos';
    await outbox.guardar(envio);
    console.warn(`${LOG_PREFIX} ${descripcion} sin intentos (${envio.id}); estado FALLIDO`);
    return envio.estado;
  }
  envio.intentos += 1;
  envio.estado = 'ENVIANDO';
  await outbox.guardar(envio);
  const inicio = performance.now();
  try {
    envio.idServidor = await enviar();
    envio.estado = 'ENVIADO';
    envio.ultimoError = undefined;
    console.info(
      `${LOG_PREFIX} ${descripcion} OK en ${(performance.now() - inicio).toFixed(1)} ms: id ${envio.idServidor} (Idempotency-Key ${envio.id})`,
    );
  } catch (e) {
    const err = e as HttpErrorResponse;
    const reintentable = esReintentable(err.status);
    envio.ultimoError = reintentable ? 'Sin conexión con el servidor' : `Rechazado (${err.status})`;
    envio.estado = !reintentable || envio.intentos >= MAX_INTENTOS ? 'FALLIDO' : 'PENDIENTE';
    console.warn(`${LOG_PREFIX} ${descripcion} falló (${err.status}); estado ${envio.estado}`);
  }
  await outbox.guardar(envio);
  return envio.estado;
}
