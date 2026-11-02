/** One row of the world ranking: the best victory of a player. */
export interface EntradaRanking {
  posicion: number;
  jugadorId: string;
  alias: string;
  puntaje: number;
  /** When the player reached that score (tie-break: whoever got it first ranks higher). */
  logradoEn: Date;
}

export interface PaginaRanking {
  contenido: EntradaRanking[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  ultima: boolean;
  /** Own position; only present when the request carried a player ID that has a victory. */
  miPosicion: EntradaRanking | null;
  generadoEn: Date;
}