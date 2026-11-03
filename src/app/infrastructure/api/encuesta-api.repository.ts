import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../core/config/api.config';
import { Encuesta, RespuestaEncuesta } from '../../domain/models/encuesta';
import { EncuestaRepository } from '../../domain/ports/encuesta.repository';
import { EncuestaResponseDto } from './dto/encuesta.dto';

@Injectable({ providedIn: 'root' })
export class EncuestaApiRepository implements EncuestaRepository {
  private readonly http = inject(HttpClient);

  /** The key makes retries safe: the API stores each key only once. The survey carries no player data. */
  enviar(datos: Encuesta, idempotencyKey: string): Observable<RespuestaEncuesta> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http
      .post<EncuestaResponseDto>(`${API_BASE}/encuesta`, datos, { headers })
      .pipe(map((dto) => ({ id: dto.id, enviadaEn: new Date(dto.enviadaEn) })));
  }
}
