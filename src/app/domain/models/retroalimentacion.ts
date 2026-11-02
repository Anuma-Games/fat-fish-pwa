export type Categoria = 'ERROR' | 'SUGERENCIA' | 'OTRO';
export type Componente = 'JUEGO' | 'PWA' | 'OTRO';

export interface Retroalimentacion {
  categoria: Categoria;
  componente: Componente;
  mensaje: string;
}

/** What the API returns after storing a submission. */
export interface RespuestaEnvio {
  id: string;
  creadaEn: Date;
}