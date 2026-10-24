import { Observable } from 'rxjs';
import { RespuestaEnvio, Retroalimentacion } from '../models/retroalimentacion';

/** Port: sends feedback; the key makes retries safe. */
export abstract class RetroalimentacionRepository {
  abstract enviar(datos: Retroalimentacion, idempotencyKey: string): Observable<RespuestaEnvio>;
}
