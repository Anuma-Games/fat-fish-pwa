/** GET /api/pwa/jugadores?busqueda= answers with an array of these. */
export interface JugadorResumenDto {
  jugadorId: string;
  alias: string;
  ultimaActividad: string;
}
