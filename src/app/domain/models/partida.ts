export type ResultadoPartida = 'VICTORIA' | 'DERROTA' | 'ABANDONO';

export interface Partida {
  id: string;
  resultado: ResultadoPartida;
  rondaAlcanzada: number;
  puntaje: number;
  dineroInvertido: number;
  dineroGanado: number;
  dineroPerdido: number;
  duracionSeg: number;
  creadaEn: Date;
}

export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  ultima: boolean;
  generadoEn: Date;
}
