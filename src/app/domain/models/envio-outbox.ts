import { Encuesta } from './encuesta';
import { Retroalimentacion } from './retroalimentacion';

/** State of a submission stored in the outbox (IndexedDB). */
export type EstadoEnvio = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'FALLIDO';

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