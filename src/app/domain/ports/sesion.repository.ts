/** Port: small values remembered on the device between visits. */
export abstract class SesionRepository {
  abstract jugadorId(): string | null;
  abstract guardarJugadorId(id: string): void;
  /** Forgets the saved player, for example when it no longer exists on the server. */
  abstract olvidarJugadorId(): void;
  abstract ultimaSincronizacion(): Date | null;
  abstract guardarUltimaSincronizacion(fecha: Date): void;
}
