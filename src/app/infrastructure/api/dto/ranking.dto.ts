import { PaginaDto } from './partida.dto';

/** Shapes exactly as they travel over the network (GET /api/pwa/ranking). */
export interface EntradaRankingDto {
  posicion: number;
  jugadorId: string;
  alias: string;
  puntaje: number;
  logradoEn: string;
}

export interface RankingDto {
  pagina: PaginaDto<EntradaRankingDto>;
  miPosicion: EntradaRankingDto | null;
}
