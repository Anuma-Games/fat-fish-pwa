import { HttpErrorResponse } from '@angular/common/http';
import { LOG_PREFIX } from '../../core/config/api.config';
import { esReintentable } from '../../core/http/errores-http';
import { EnvioOutbox, EstadoEnvio } from '../../domain/models/envio-outbox';
import { OutboxRepository } from '../../domain/ports/outbox.repository';

export const MAX_INTENTOS = 5;

/**
 * One attempt to send a submission of the outbox, shared by every kind of submission.
 * Updates the envelope (attempts, state, error) and saves it each time it changes.
 * A temporary failure leaves it PENDIENTE until MAX_INTENTOS; anything else is FALLIDO.
 * `enviar` must resolve with the id the server gave to the stored record.
 */
export async function intentarEnvio(
  envio: EnvioOutbox,
  outbox: OutboxRepository,
  enviar: () => Promise<string>,
  descripcion: string,
): Promise<EstadoEnvio> {
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
