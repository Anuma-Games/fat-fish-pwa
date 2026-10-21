/** Port: small values remembered on the device between visits. */
export abstract class SesionRepository {
  abstract jugadorId(): string | null;
  abstract guardarJugadorId(id: string): void;
  abstract ultimaSincronizacion(): Date | null;
  abstract guardarUltimaSincronizacion(fecha: Date): void;
}
