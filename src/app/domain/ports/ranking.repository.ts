import { Observable } from 'rxjs';
import { PaginaRanking } from '../models/ranking';

/** Port: world ranking, in pages. With a player ID the page also carries that player's position. */
export abstract class RankingRepository {
  abstract pagina(pagina: number, jugadorId: string | null): Observable<PaginaRanking>;
}