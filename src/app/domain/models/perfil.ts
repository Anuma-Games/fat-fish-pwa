export interface Estadisticas {
  partidasTotales: number;
  partidasGanadas: number;
  totalInvertido: number;
  totalPerdido: number;
  rachaDerrotasMax: number;
  tiempoJugadoSeg: number;
}

export interface Perfil {
  jugadorId: string;
  alias: string;
  creadoEn: Date;
  ultimaActividad: Date | null;
  estadisticas: Estadisticas;
  generadoEn: Date;
}
