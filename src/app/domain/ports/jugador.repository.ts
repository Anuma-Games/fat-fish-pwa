import { Observable } from 'rxjs';
import { JugadorResumen } from '../models/jugador-resumen';

/** Port: search players by alias or ID. */
export abstract class JugadorRepository {
  abstract buscar(texto: string): Observable<JugadorResumen[]>;
}