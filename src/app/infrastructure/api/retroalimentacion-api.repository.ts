import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { RespuestaEnvio, Retroalimentacion } from '../../domain/models/retroalimentacion';
import { RetroalimentacionRepository } from '../../domain/ports/retroalimentacion.repository';
import { RetroalimentacionResponseDto } from './dto/partida.dto';

@Injectable({ providedIn: 'root' })
export class RetroalimentacionApiRepository implements RetroalimentacionRepository {
  private readonly http = inject(HttpClient);

  /** The key makes retries safe: the API stores each key only once. */
  enviar(datos: Retroalimentacion, idempotencyKey: string): Observable<RespuestaEnvio> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http
      .post<RetroalimentacionResponseDto>(`${API_BASE}/retroalimentacion`, datos, { headers })
      .pipe(map((dto) => ({ id: dto.id, creadaEn: new Date(dto.creadaEn) })));
  }
}
