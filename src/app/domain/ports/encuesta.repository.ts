import { Observable } from 'rxjs';
import { Encuesta, RespuestaEncuesta } from '../models/encuesta';

/** Port: sends the anonymous survey; the key makes retries safe. */
export abstract class EncuestaRepository {
  abstract enviar(datos: Encuesta, idempotencyKey: string): Observable<RespuestaEncuesta>;
}