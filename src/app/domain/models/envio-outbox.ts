import { Encuesta } from './encuesta';
import { Retroalimentacion } from './retroalimentacion';

/** State of a submission stored in the outbox (IndexedDB). */
export type EstadoEnvio = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'FALLIDO';

/**
 * Whether a submission still has to reach the API. ENVIANDO counts too: it is only set inside the
 * outbox lock, so a submission seen ENVIANDO inside the lock was abandoned (the tab closed or the
 * service worker stopped mid-request) and is sent again with the same Idempotency-Key.
 */
export const porEnviar = (envio: { estado: EstadoEnvio }): boolean =>
  envio.estado === 'PENDIENTE' || envio.estado === 'ENVIANDO';

interface EnvioBase {
  /** Generated on the device; also sent as the Idempotency-Key header. */
  id: string;
  creadoEn: string;
  intentos: number;
  estado: EstadoEnvio;
  idServidor?: string;
  ultimoError?: string;
}

export interface EnvioRetroalimentacion extends EnvioBase {
  tipo: 'retroalimentacion';
  contenido: Retroalimentacion;
}

export interface EnvioEncuesta extends EnvioBase {
  tipo: 'encuesta';
  contenido: Encuesta;
}

/** Everything the outbox can hold. `tipo` tells each facade which submissions are its own. */
export type EnvioOutbox = EnvioRetroalimentacion | EnvioEncuesta;

/** Outcome of a submit, as the UI sees it. */
export type ResultadoEnvio = 'ENVIADO' | 'EN_COLA' | 'RECHAZADO';
