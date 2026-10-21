import { Observable } from 'rxjs';
import { Pagina, Partida } from '../models/partida';

/** Port: run history of a player, in pages. */
export abstract class PartidaRepository {
  abstract historial(
    jugadorId: string,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<Partida>>;
}
