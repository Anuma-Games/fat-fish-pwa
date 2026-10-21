import { Observable } from 'rxjs';
import { Perfil } from '../models/perfil';

/** Port: player profile with statistics. Bound to its implementation in app.config.ts. */
export abstract class PerfilRepository {
  abstract perfil(jugadorId: string): Observable<Perfil>;
}
