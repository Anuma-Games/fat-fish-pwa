export type Categoria = 'ERROR' | 'SUGERENCIA' | 'OTRO';
export type Componente = 'JUEGO' | 'PWA' | 'OTRO';

export interface Retroalimentacion {
  categoria: Categoria;
  componente: Componente;
  mensaje: string;
}

/** State of a submission stored in the outbox (IndexedDB). */
export type EstadoEnvio = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'FALLIDO';

export interface EnvioOutbox {
  /** Generated on the device; also sent as the Idempotency-Key header. */
  id: string;
  tipo: 'retroalimentacion';
  contenido: Retroalimentacion;
  creadoEn: string;
  intentos: number;
  estado: EstadoEnvio;
  idServidor?: string;
  ultimoError?: string;
}
