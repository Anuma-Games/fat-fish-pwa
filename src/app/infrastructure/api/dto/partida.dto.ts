import { ResultadoPartida } from '../../../domain/models/partida';

/** Shapes exactly as they travel over the network (GET /api/pwa/partidas). */
export interface PartidaDto {
  id: string;
  resultado: ResultadoPartida;
  rondaAlcanzada: number;
  puntaje: number;
  dineroInvertido: number;
  dineroGanado: number;
  dineroPerdido: number;
  duracionSeg: number;
  creadaEn: string;
}

export interface PaginaDto<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
  generadoEn: string;
}

export interface RetroalimentacionResponseDto {
  id: string;
  creadaEn: string;
}

export interface PerfilDto {
  jugadorId: string;
  alias: string;
  creadoEn: string;
  ultimaActividad: string | null;
  estadisticas: {
    partidasTotales: number;
    partidasGanadas: number;
    totalInvertido: number;
    totalPerdido: number;
    rachaDerrotasMax: number;
    tiempoJugadoSeg: number;
  };
  generadoEn: string;
}
